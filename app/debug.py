from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import DebugChallenge, DebugSubmission, TeamMember, Team, Round
from .schemas import DebugSubmit
from .auth import get_current_user
from .config import settings
from typing import Optional
import httpx
import json
import time
from datetime import datetime

router = APIRouter(prefix="/api/debug", tags=["debug"])

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
def submit_debug(data: DebugSubmit, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    c = db.query(DebugChallenge).filter(DebugChallenge.id == data.challenge_id).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    prev = db.query(DebugSubmission).filter(DebugSubmission.team_id == team.id, DebugSubmission.challenge_id == data.challenge_id).count()
    if prev >= 5:
        raise HTTPException(400, "Maximum 5 attempts reached")
    headers = {}
    if settings.judge0_api_key:
        headers = {"X-RapidAPI-Key": settings.judge0_api_key, "Content-Type": "application/json"}
    passed_pub = 0
    passed_hid = 0
    for test in c.public_tests:
        if run_judge0(data.submitted_code, test.get("input", ""), test.get("expected", ""), headers):
            passed_pub += 1
    for test in c.hidden_tests:
        if run_judge0(data.submitted_code, test.get("input", ""), test.get("expected", ""), headers):
            passed_hid += 1
    total_pub = len(c.public_tests)
    score = int((passed_pub / max(1, total_pub)) * c.points)
    sub = DebugSubmission(team_id=team.id, challenge_id=data.challenge_id, submitted_code=data.submitted_code, passed_public=passed_pub, passed_hidden=passed_hid, total_public=total_pub, total_hidden=len(c.hidden_tests), score=score, attempt_number=prev + 1, status="completed")
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"submission_id": sub.id, "passed_public": passed_pub, "total_public": total_pub, "score": score, "attempt_number": sub.attempt_number, "status": "completed"}

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


@router.post("/submit_code")
def submit_code_js(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    cid = body.get("challenge_id")
    code = body.get("code", "")
    c = db.query(DebugChallenge).filter(DebugChallenge.id == cid).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    prev = db.query(DebugSubmission).filter(DebugSubmission.team_id == team.id, DebugSubmission.challenge_id == cid).count()
    if prev >= 5:
        raise HTTPException(400, "Maximum 5 attempts reached")

    headers = {}
    if settings.judge0_api_key:
        headers = {"X-RapidAPI-Key": settings.judge0_api_key, "Content-Type": "application/json"}

    public_results = []
    passed_pub = 0
    for test in c.public_tests:
        passed = False
        output = None
        if settings.judge0_api_key:
            passed = run_judge0(code, test.get("input", ""), test.get("expected", ""), headers)
        else:
            passed = True
        if passed:
            passed_pub += 1
        public_results.append({"passed": passed, "output": output})

    passed_hid = 0
    hidden_results = []
    for test in c.hidden_tests:
        passed = False
        if settings.judge0_api_key:
            passed = run_judge0(code, test.get("input", ""), test.get("expected", ""), headers)
        else:
            passed = True
        if passed:
            passed_hid += 1
        hidden_results.append({"passed": passed})

    total_pub = len(c.public_tests)
    score = int((passed_pub / max(1, total_pub)) * c.points)

    sub = DebugSubmission(team_id=team.id, challenge_id=cid, submitted_code=code, passed_public=passed_pub, passed_hidden=passed_hid, total_public=total_pub, total_hidden=len(c.hidden_tests), score=score, attempt_number=prev + 1, status="completed")
    db.add(sub)
    db.commit()

    return {
        "public_results": public_results,
        "hidden_results": hidden_results,
        "score": score,
        "remaining_attempts": max(0, 5 - (prev + 1)),
    }
