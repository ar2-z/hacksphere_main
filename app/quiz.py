import json
import math
import threading
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import Answer, Clue, Question, Round, Score, Team, TeamClue
from .schemas import AnswerSubmit
from .teams import ensure_user_team

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

# Position-based scoring per question: 1st correct = 10, 2nd = 8, 3rd = 6, every other correct = 5.
QUIZ_POINTS_LADDER = (10, 8, 6, 5)
# Small window in seconds past a question's deadline where late submissions still count.
WINDOW_GRACE_SECONDS = 3
# Seconds shown to participants after the admin starts a round before Q1 opens.
START_DELAY_SECONDS = 5

_position_lock = threading.Lock()


def _to_utc(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def get_user_team(user, db):
    """Return the user's team, auto-creating a single-member team when absent."""
    return ensure_user_team(db, user)


def start_round(rnd, db):
    rnd.status = "active"
    rnd.started_at = datetime.now(timezone.utc)
    rnd.paused_at = None
    rnd.total_paused_seconds = 0


def pause_round(rnd, db):
    rnd.status = "paused"
    if rnd.paused_at is None:
        rnd.paused_at = datetime.now(timezone.utc)


def resume_round(rnd, db):
    now = datetime.now(timezone.utc)
    if rnd.paused_at is not None:
        paused_at = _to_utc(rnd.paused_at)
        rnd.total_paused_seconds = (rnd.total_paused_seconds or 0) + max(
            0, int((now - paused_at).total_seconds())
        )
        rnd.paused_at = None
    rnd.status = "active"


def effective_elapsed(rnd, now=None):
    """Wall-clock seconds the round has actually been running, excluding pause time."""
    start = _to_utc(rnd.started_at)
    if start is None:
        return 0.0
    now = now or datetime.now(timezone.utc)
    paused = rnd.total_paused_seconds or 0
    if rnd.status == "paused" and rnd.paused_at is not None:
        paused += (now - _to_utc(rnd.paused_at)).total_seconds()
    return max(0.0, (now - start).total_seconds() - paused)


def active_elapsed(rnd, now=None):
    """Seconds the round has run past the pre-start countdown (0 before questions open)."""
    return max(0.0, effective_elapsed(rnd, now) - START_DELAY_SECONDS)


def ordered_questions(db, round_number):
    return (
        db.query(Question)
        .filter(Question.round_number == round_number, Question.is_active == True)
        .order_by(Question.id)
        .all()
    )


def _question_payload(q):
    opts = q.options
    if isinstance(opts, str):
        opts = json.loads(opts)
    return {
        "id": q.id,
        "round_number": q.round_number,
        "question_text": q.question_text,
        "option_a": opts[0] if len(opts) > 0 else "",
        "option_b": opts[1] if len(opts) > 1 else "",
        "option_c": opts[2] if len(opts) > 2 else "",
        "option_d": opts[3] if len(opts) > 3 else "",
        "difficulty": q.difficulty,
        "points": q.points,
        "time_limit_seconds": q.time_limit_seconds,
    }


def _current_index(qs, elapsed, per_question_seconds):
    if not qs:
        return -1
    idx = int(max(0.0, elapsed) // max(1, per_question_seconds))
    return min(idx, len(qs) - 1)


def _quiz_round(db, round_number):
    return (
        db.query(Round)
        .filter(Round.phase == "quiz", Round.round_number == round_number)
        .first()
    )


def _quiz_total(db, team):
    quiz_rns = [
        rn
        for (rn,) in db.query(Round.round_number).filter(Round.phase == "quiz").all()
    ]
    if not quiz_rns:
        return 0
    total = (
        db.query(func.coalesce(func.sum(Answer.points_earned), 0))
        .join(Question, Answer.question_id == Question.id)
        .filter(Answer.team_id == team.id, Question.round_number.in_(quiz_rns))
        .scalar()
    )
    return int(total or 0)


def _upsert_quiz_score(db, team):
    total = _quiz_total(db, team)
    entry = (
        db.query(Score).filter(Score.team_id == team.id, Score.phase == "quiz").first()
    )
    if entry:
        entry.score = total
    else:
        db.add(Score(team_id=team.id, phase="quiz", score=total))


def _unlock_clue(db, team, round_number):
    total = (
        db.query(Question)
        .filter(Question.round_number == round_number, Question.is_active == True)
        .count()
    )
    done = (
        db.query(Answer)
        .join(Question)
        .filter(Answer.team_id == team.id, Question.round_number == round_number)
        .count()
    )
    if done >= total:
        clue = db.query(Clue).filter(Clue.round_number == round_number).first()
        if clue:
            tc = (
                db.query(TeamClue)
                .filter(TeamClue.team_id == team.id, TeamClue.clue_id == clue.id)
                .first()
            )
            if not tc:
                tc = TeamClue(team_id=team.id, clue_id=clue.id)
            tc.is_unlocked = True
            tc.unlocked_at = datetime.now(timezone.utc)
            db.add(tc)


def _points_for(question_id, is_correct, db, now):
    if not is_correct:
        return 0
    prior = (
        db.query(Answer)
        .filter(Answer.question_id == question_id, Answer.is_correct == True)
        .all()
    )
    prior = [a for a in prior if (_to_utc(a.answered_at) or now) < now]
    position = len(prior)
    if position < len(QUIZ_POINTS_LADDER):
        return QUIZ_POINTS_LADDER[position]
    return QUIZ_POINTS_LADDER[-1]


def _record_answer(db, team, q, selected_answer):
    rnd = _quiz_round(db, q.round_number)
    if not rnd or rnd.status != "active":
        raise HTTPException(400, "Round is not active")
    if rnd.started_at is None:
        raise HTTPException(400, "Round is not started")
    qs = ordered_questions(db, q.round_number)
    ids = [item.id for item in qs]
    if q.id not in ids:
        raise HTTPException(400, "Question is not part of the round")
    q_idx = ids.index(q.id)
    per_q = q.time_limit_seconds or 120
    if effective_elapsed(rnd) < START_DELAY_SECONDS:
        raise HTTPException(400, "Quiz is starting, questions not open yet")
    elapsed = active_elapsed(rnd)
    if elapsed >= len(qs) * per_q:
        raise HTTPException(400, "Quiz has ended")
    q_start = q_idx * per_q
    q_end = q_start + per_q + WINDOW_GRACE_SECONDS
    if elapsed < q_start:
        raise HTTPException(400, "This question is not open yet")
    if elapsed > q_end:
        raise HTTPException(400, "Time expired for this question")

    with _position_lock:
        existing = (
            db.query(Answer)
            .filter(Answer.team_id == team.id, Answer.question_id == q.id)
            .first()
        )
        if existing:
            return {"detail": "Already answered"}
        now = datetime.now(timezone.utc)
        corr = selected_answer == q.correct_answer
        pts = _points_for(q.id, corr, db, now)
        a = Answer(
            team_id=team.id,
            question_id=q.id,
            selected_answer=selected_answer,
            is_correct=corr,
            points_earned=pts,
            response_time_seconds=elapsed - q_idx * per_q,
            answered_at=now,
        )
        db.add(a)
        db.flush()
        _unlock_clue(db, team, q.round_number)
        _upsert_quiz_score(db, team)
        db.commit()
        db.refresh(a)
    return {"is_correct": corr, "points_earned": pts}


@router.get("/rounds")
def list_rounds(db: Session = Depends(get_db)):
    rns = [r[0] for r in db.query(Question.round_number).distinct().all()]
    rounds = db.query(Round).filter(Round.round_number.in_(rns)).all() if rns else []
    m = {r.round_number: r.status for r in rounds}
    return [{"round_number": rn, "status": m.get(rn, "unknown")} for rn in sorted(rns)]


@router.get("/questions/{round_number}")
def list_questions(
    round_number: int, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    rnd = _quiz_round(db, round_number)
    if not rnd or rnd.status != "active":
        raise HTTPException(400, "Round is not active")
    get_user_team(user, db)
    qs = ordered_questions(db, round_number)
    per_q = qs[0].time_limit_seconds if qs else 120
    if effective_elapsed(rnd) < START_DELAY_SECONDS:
        return []
    elapsed = active_elapsed(rnd)
    if elapsed >= len(qs) * per_q:
        return []
    idx = _current_index(qs, elapsed, per_q)
    q = qs[idx] if qs and idx >= 0 else None
    if not q:
        return []
    return [_question_payload(q)]


@router.post("/submit")
def submit_answer(data: AnswerSubmit, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    q = db.query(Question).filter(Question.id == data.question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    return _record_answer(db, team, q, data.selected_answer)


@router.get("/answers/{round_number}")
def get_answers(round_number: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    ans = (
        db.query(Answer)
        .join(Question)
        .filter(Answer.team_id == team.id, Question.round_number == round_number)
        .all()
    )
    return [
        {
            "question_id": a.question_id,
            "selected_answer": a.selected_answer,
            "is_correct": a.is_correct,
            "points_earned": a.points_earned,
            "response_time_seconds": a.response_time_seconds,
            "answered_at": a.answered_at.isoformat() if a.answered_at else None,
        }
        for a in ans
    ]


@router.get("/clues/{round_number}")
def get_clues(round_number: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    res = []
    for clue in db.query(Clue).filter(Clue.round_number == round_number).all():
        tc = (
            db.query(TeamClue)
            .filter(TeamClue.team_id == team.id, TeamClue.clue_id == clue.id)
            .first()
        )
        if tc and tc.is_unlocked:
            res.append(
                {
                    "clue_id": clue.id,
                    "clue_text": clue.clue_text,
                    "unlocked_at": tc.unlocked_at.isoformat() if tc.unlocked_at else None,
                }
            )
    return res


@router.get("/round/current")
def get_current_round(user=Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    team = get_user_team(user, db)
    base = {
        "round_number": None,
        "status": "inactive",
        "server_time": now.isoformat(),
        "started_at": None,
        "per_question_seconds": 120,
        "question_index": -1,
        "total_questions": 0,
        "remaining_seconds": 0,
        "finished": False,
        "answered_current": False,
        "time_limit_seconds": 120,
        "question": None,
    }

    active = (
        db.query(Round)
        .filter(Round.phase == "quiz", Round.status == "active")
        .order_by(Round.round_number)
        .first()
    )
    if active:
        qs = ordered_questions(db, active.round_number)
        per_q = qs[0].time_limit_seconds if qs else 120
        elapsed = effective_elapsed(active, now)
        if elapsed < START_DELAY_SECONDS:
            return {
                "round_number": active.round_number,
                "status": "active",
                "countdown": True,
                "starts_in": max(1, math.ceil(START_DELAY_SECONDS - elapsed)),
                "server_time": now.isoformat(),
                "started_at": active.started_at.isoformat() if active.started_at else None,
                "per_question_seconds": per_q,
                "question_index": -1,
                "total_questions": len(qs),
                "remaining_seconds": max(0, int(START_DELAY_SECONDS - elapsed)),
                "finished": False,
                "answered_current": False,
                "time_limit_seconds": per_q,
                "question": None,
            }
        elapsed = active_elapsed(active, now)
        finished = (not qs) or elapsed >= len(qs) * per_q
        idx = _current_index(qs, elapsed, per_q) if not finished else -1
        q = qs[idx] if qs and idx >= 0 else None
        answered = False
        if q:
            answered = (
                db.query(Answer)
                .filter(Answer.team_id == team.id, Answer.question_id == q.id)
                .first()
                is not None
            )
        remaining = max(0, int(per_q - (elapsed - idx * per_q))) if qs and idx >= 0 else 0
        return {
            "round_number": active.round_number,
            "status": "active",
            "server_time": now.isoformat(),
            "started_at": active.started_at.isoformat() if active.started_at else None,
            "per_question_seconds": per_q,
            "question_index": idx,
            "total_questions": len(qs),
            "remaining_seconds": remaining,
            "finished": finished,
            "answered_current": answered,
            "time_limit_seconds": per_q,
            "question": _question_payload(q) if q else None,
        }

    completed = (
        db.query(Round)
        .filter(Round.phase == "quiz", Round.status == "completed")
        .order_by(Round.round_number.desc())
        .first()
    )
    if completed:
        qs = ordered_questions(db, completed.round_number)
        return {
            **base,
            "round_number": completed.round_number,
            "status": "completed",
            "total_questions": len(qs),
            "finished": True,
        }

    paused = (
        db.query(Round)
        .filter(Round.phase == "quiz", Round.status == "paused")
        .order_by(Round.round_number)
        .first()
    )
    if paused:
        return {**base, "round_number": paused.round_number, "status": "paused"}

    return base


@router.post("/answer")
def submit_single_answer(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    qid = body.get("question_id")
    selected = body.get("selected_option", "A").upper()
    opt_map = {"A": 0, "B": 1, "C": 2, "D": 3}
    selected_answer = opt_map.get(selected, 0)
    q = db.query(Question).filter(Question.id == qid).first()
    if not q:
        raise HTTPException(404, "Question not found")
    return _record_answer(db, team, q, selected_answer)


@router.get("/results")
def get_round_results(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    rnd = (
        db.query(Round)
        .filter(Round.phase == "quiz", Round.status == "completed")
        .order_by(Round.round_number.desc())
        .first()
    )
    if not rnd:
        rnd = (
            db.query(Round)
            .filter(Round.phase == "quiz", Round.status == "active")
            .order_by(Round.round_number)
            .first()
        )
    if not rnd:
        return {"correct": 0, "incorrect": 0, "unanswered": 0, "total_score": 0, "clue": None}

    total_qs = (
        db.query(Question)
        .filter(Question.round_number == rnd.round_number, Question.is_active == True)
        .count()
    )
    answers = (
        db.query(Answer)
        .join(Question)
        .filter(Answer.team_id == team.id, Question.round_number == rnd.round_number)
        .all()
    )
    correct = sum(1 for a in answers if a.is_correct)
    incorrect = sum(1 for a in answers if not a.is_correct)
    total_score = sum(a.points_earned for a in answers)

    clue_text = None
    clue = db.query(Clue).filter(Clue.round_number == rnd.round_number).first()
    if clue:
        tc = (
            db.query(TeamClue)
            .filter(
                TeamClue.team_id == team.id,
                TeamClue.clue_id == clue.id,
                TeamClue.is_unlocked == True,
            )
            .first()
        )
        if tc:
            clue_text = clue.clue_text

    return {
        "correct": correct,
        "incorrect": incorrect,
        "unanswered": total_qs - len(answers),
        "total_score": total_score,
        "clue": clue_text,
    }
