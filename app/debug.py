import httpx
import threading
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import get_current_user
from .config import settings
from .database import SessionLocal, get_db
from .models import DebugChallenge, DebugSubmission, Round, Team, TeamMember

router = APIRouter(prefix="/api/debug", tags=["debug"])

running_jobs: set[int] = set()
job_results: dict[int, dict] = {}
_judge_semaphore = threading.BoundedSemaphore(4)
_submit_lock = threading.Lock()

def get_user_team(user, db):
    tm = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if not tm:
        raise HTTPException(403, "Not a member of any team")
    return db.query(Team).filter(Team.id == tm.team_id).first()

def run_judge0(code, stdin, expected, headers):
    with httpx.Client(timeout=30) as client:
        resp = client.post(f"{settings.judge0_url}/submissions", json={"source_code": code, "language_id": 71, "stdin": stdin, "expected_output": expected, "cpu_time_limit": 5, "memory_limit": 128000}, headers=headers)
        sub = resp.json()
        token = sub.get("token")
        if not token:
            return False
        while True:
            result = client.get(f"{settings.judge0_url}/submissions/{token}", headers=headers)
            r = result.json()
            if r.get("status", {}).get("id") in (1, 2):
                time.sleep(0.5)
                continue
            return r.get("stdout", "").strip() == expected.strip()

@router.get("/challenges")
def list_challenges(db: Session = Depends(get_db)):
    cs = db.query(DebugChallenge).filter(DebugChallenge.is_active == True).all()
    return [{"id": c.id, "round_number": c.round_number, "title": c.title, "description": c.description, "public_tests": c.public_tests, "difficulty": c.difficulty, "points": c.points, "time_limit_minutes": c.time_limit_minutes} for c in cs]

@router.get("/challenges/{challenge_id}")
def get_challenge(challenge_id: int, db: Session = Depends(get_db)):
    c = db.query(DebugChallenge).filter(DebugChallenge.id == challenge_id).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    return {"id": c.id, "round_number": c.round_number, "title": c.title, "description": c.description, "buggy_code": c.buggy_code, "public_tests": c.public_tests, "difficulty": c.difficulty, "points": c.points, "time_limit_minutes": c.time_limit_minutes}

@router.post("/submit")
def submit_code(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    cid = body.get("challenge_id")
    code = body.get("code", "")
    c = db.query(DebugChallenge).filter(DebugChallenge.id == cid).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    with _submit_lock:
        prev = db.query(DebugSubmission).filter(DebugSubmission.team_id == team.id, DebugSubmission.challenge_id == cid).count()
        if prev >= 5:
            raise HTTPException(400, "Maximum 5 attempts reached")
        sub = DebugSubmission(
            team_id=team.id,
            challenge_id=cid,
            submitted_code=code,
            passed_public=0,
            passed_hidden=0,
            total_public=len(c.public_tests),
            total_hidden=len(c.hidden_tests),
            score=0,
            attempt_number=prev + 1,
            status="running",
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    sid = sub.id
    running_jobs.add(sid)
    threading.Thread(
        target=_execute_submission_job,
        args=(sid, code, c.public_tests, c.hidden_tests, c.points),
        daemon=True,
    ).start()
    return {"submission_id": sid, "status": "running", "remaining_attempts": max(0, 5 - (prev + 1))}

def _execute_submission_job(sid: int, code: str, public_tests: list, hidden_tests: list, points: int):
    res = {}
    try:
        headers = {}
        if settings.judge0_api_key:
            headers = {"X-RapidAPI-Key": settings.judge0_api_key, "Content-Type": "application/json"}
        public_results = []
        passed_pub = 0
        for test in public_tests:
            passed = False
            output = None
            if settings.judge0_api_key:
                with _judge_semaphore:
                    passed = run_judge0(code, test.get("input", ""), test.get("expected", ""), headers)
            else:
                passed = True
            if passed:
                passed_pub += 1
            public_results.append({"passed": passed, "output": output})
        hidden_results = []
        passed_hid = 0
        for test in hidden_tests:
            passed = False
            if settings.judge0_api_key:
                with _judge_semaphore:
                    passed = run_judge0(code, test.get("input", ""), test.get("expected", ""), headers)
            else:
                passed = True
            if passed:
                passed_hid += 1
            hidden_results.append({"passed": passed})
        total_pub = len(public_tests)
        score = int((passed_pub / max(1, total_pub)) * points)
        res = {
            "status": "completed",
            "public_results": public_results,
            "hidden_results": hidden_results,
            "score": score,
            "passed_public": passed_pub,
            "total_public": total_pub,
            "passed_hidden": passed_hid,
            "total_hidden": len(hidden_tests),
        }
    except Exception as e:
        res = {"status": "failed", "error": str(e)[:300]}
    finally:
        job_results[sid] = res
    db = SessionLocal()
    try:
        sub = db.query(DebugSubmission).filter(DebugSubmission.id == sid).first()
        if sub:
            sub.passed_public = res.get("passed_public", 0)
            sub.passed_hidden = res.get("passed_hidden", 0)
            sub.total_public = res.get("total_public", 0)
            sub.total_hidden = res.get("total_hidden", 0)
            sub.score = res.get("score", 0)
            sub.status = res.get("status", "failed")
            db.commit()
    finally:
        db.close()
    running_jobs.discard(sid)

@router.get("/results/{submission_id}")
def get_submission_result(submission_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    sub = db.query(DebugSubmission).filter(DebugSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(404, "Submission not found")
    if sub.team_id != team.id:
        raise HTTPException(403, "Not your submission")
    remaining = max(0, 5 - db.query(DebugSubmission).filter(DebugSubmission.team_id == team.id, DebugSubmission.challenge_id == sub.challenge_id).count())
    if sub.id in running_jobs:
        return {"status": "running"}
    if sub.status == "running":
        sub.status = "failed"
        db.commit()
        return {"status": "failed", "error": "Execution was interrupted. Please try again.", "score": 0, "remaining_attempts": remaining}
    data = job_results.get(sub.id)
    if data:
        data = dict(data)
        data["remaining_attempts"] = remaining
        return data
    return {
        "status": sub.status,
        "score": sub.score,
        "passed_public": sub.passed_public,
        "total_public": sub.total_public,
        "passed_hidden": sub.passed_hidden,
        "total_hidden": sub.total_hidden,
        "remaining_attempts": remaining,
    }

@router.get("/results")
def get_results(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    subs = db.query(DebugSubmission).filter(DebugSubmission.team_id == team.id).all()
    return [{"challenge_id": s.challenge_id, "passed_public": s.passed_public, "total_public": s.total_public, "score": s.score, "attempt_number": s.attempt_number, "status": s.status, "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None} for s in subs]

@router.get("/round/current")
def get_current_debug_round(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    rnd = db.query(Round).filter(Round.phase == "debug", Round.status == "active").order_by(Round.round_number).first()
    if not rnd:
        rnd = db.query(Round).filter(Round.phase == "debug", Round.status == "completed").order_by(Round.round_number.desc()).first()
    if not rnd:
        return {"status": "inactive", "challenges": [], "time_limit_minutes": 0}

    challenges = db.query(DebugChallenge).filter(DebugChallenge.round_number == rnd.round_number, DebugChallenge.is_active == True).all()
    chal_list = []
    for c in challenges:
        prev = db.query(DebugSubmission).filter(DebugSubmission.team_id == team.id, DebugSubmission.challenge_id == c.id).count()
        chal_list.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "buggy_code": c.buggy_code,
            "public_tests": c.public_tests,
            "difficulty": c.difficulty,
            "points": c.points,
            "remaining_attempts": max(0, 5 - prev),
        })

    return {
        "status": rnd.status,
        "challenges": chal_list,
        "time_limit_minutes": rnd.time_limit_minutes or 30,
    }

def reset_stuck_submissions():
    db = SessionLocal()
    try:
        db.query(DebugSubmission).filter(DebugSubmission.status == "running").update(
            {"status": "failed"}, synchronize_session=False
        )
        db.commit()
    finally:
        db.close()
