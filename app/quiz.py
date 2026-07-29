import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import Question, Answer, Round, Clue, TeamClue, TeamMember, Team, Competition
from .schemas import AnswerSubmit
from .auth import get_current_user
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

def get_user_team(user, db):
    tm = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if not tm:
        raise HTTPException(403, "Not a member of any team")
    return db.query(Team).filter(Team.id == tm.team_id).first()

@router.get("/rounds")
def list_rounds(db: Session = Depends(get_db)):
    rns = [r[0] for r in db.query(Question.round_number).distinct().all()]
    rounds = db.query(Round).filter(Round.round_number.in_(rns)).all() if rns else []
    m = {r.round_number: r.status for r in rounds}
    return [{"round_number": rn, "status": m.get(rn, "unknown")} for rn in sorted(rns)]

@router.get("/questions/{round_number}")
def list_questions(round_number: int, db: Session = Depends(get_db)):
    rnd = db.query(Round).filter(Round.round_number == round_number).first()
    if not rnd or rnd.status != "active":
        raise HTTPException(400, "Round is not active")
    qs = db.query(Question).filter(Question.round_number == round_number).all()
    return [{"id": q.id, "round_number": q.round_number, "question_text": q.question_text, "options": q.options, "difficulty": q.difficulty, "points": q.points, "time_limit_seconds": q.time_limit_seconds} for q in qs]

@router.post("/submit")
def submit_answer(data: AnswerSubmit, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    q = db.query(Question).filter(Question.id == data.question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    rnd = db.query(Round).filter(Round.round_number == q.round_number).first()
    if not rnd or rnd.status != "active":
        raise HTTPException(400, "Round is not active")
    if db.query(Answer).filter(Answer.team_id == team.id, Answer.question_id == data.question_id).first():
        raise HTTPException(400, "Already answered this question")
    corr = data.selected_answer == q.correct_answer
    pts = 0
    if corr:
        ratio = max(0.0, min(1.0, 1.0 - data.response_time_seconds / max(1, q.time_limit_seconds)))
        pts = q.points + int(q.points * 0.5 * ratio)
    a = Answer(team_id=team.id, question_id=data.question_id, selected_answer=data.selected_answer, is_correct=corr, points_earned=pts, response_time_seconds=data.response_time_seconds)
    db.add(a)
    total = db.query(Question).filter(Question.round_number == q.round_number).count()
    done = db.query(Answer).join(Question).filter(Answer.team_id == team.id, Question.round_number == q.round_number).count()
    if done >= total:
        clue = db.query(Clue).filter(Clue.round_number == q.round_number).first()
        if clue:
            tc = db.query(TeamClue).filter(TeamClue.team_id == team.id, TeamClue.clue_id == clue.id).first()
            if not tc:
                tc = TeamClue(team_id=team.id, clue_id=clue.id)
            tc.is_unlocked = True
            tc.unlocked_at = datetime.utcnow()
            db.add(tc)
    db.commit()
    db.refresh(a)
    return {"answer_id": a.id, "is_correct": corr, "points_earned": pts, "correct_answer": q.correct_answer}

@router.get("/answers/{round_number}")
def get_answers(round_number: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    ans = db.query(Answer).join(Question).filter(Answer.team_id == team.id, Question.round_number == round_number).all()
    return [{"question_id": a.question_id, "selected_answer": a.selected_answer, "is_correct": a.is_correct, "points_earned": a.points_earned, "response_time_seconds": a.response_time_seconds, "answered_at": a.answered_at.isoformat() if a.answered_at else None} for a in ans]

@router.get("/clues/{round_number}")
def get_clues(round_number: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    res = []
    for clue in db.query(Clue).filter(Clue.round_number == round_number).all():
        tc = db.query(TeamClue).filter(TeamClue.team_id == team.id, TeamClue.clue_id == clue.id).first()
        if tc and tc.is_unlocked:
            res.append({"clue_id": clue.id, "clue_text": clue.clue_text, "unlocked_at": tc.unlocked_at.isoformat() if tc.unlocked_at else None})
    return res


@router.get("/round/current")
def get_current_round(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    competition = db.query(Competition).filter(Competition.is_active == True).first()
    round_num = None
    status = "inactive"
    time_limit = 30

    rnd = db.query(Round).filter(Round.phase == "quiz", Round.status == "active").order_by(Round.round_number).first()
    if rnd:
        round_num = rnd.round_number
        status = "active"
        time_limit = (rnd.time_limit_minutes or 15) * 60
    else:
        rnd = db.query(Round).filter(Round.phase == "quiz", Round.status == "completed").order_by(Round.round_number.desc()).first()
        if rnd:
            round_num = rnd.round_number
            status = "completed"

    qs = db.query(Question).filter(Question.round_number == round_num).all() if round_num else []
    questions = []
    for q in qs:
        opts = q.options
        if isinstance(opts, str):
            opts = json.loads(opts)
        questions.append({
            "id": q.id,
            "question_text": q.question_text,
            "option_a": opts[0] if len(opts) > 0 else "",
            "option_b": opts[1] if len(opts) > 1 else "",
            "option_c": opts[2] if len(opts) > 2 else "",
            "option_d": opts[3] if len(opts) > 3 else "",
            "difficulty": q.difficulty,
            "points": q.points,
        })

    return {"round_number": round_num, "status": status, "time_limit_seconds": time_limit, "questions": questions}


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
    if db.query(Answer).filter(Answer.team_id == team.id, Answer.question_id == qid).first():
        return {"detail": "Already answered"}

    corr = selected_answer == q.correct_answer
    pts = q.points if corr else 0
    a = Answer(team_id=team.id, question_id=qid, selected_answer=selected_answer, is_correct=corr, points_earned=pts, response_time_seconds=0)
    db.add(a)
    total = db.query(Question).filter(Question.round_number == q.round_number).count()
    done = db.query(Answer).join(Question).filter(Answer.team_id == team.id, Question.round_number == q.round_number).count()
    if done >= total:
        clue = db.query(Clue).filter(Clue.round_number == q.round_number).first()
        if clue:
            tc = db.query(TeamClue).filter(TeamClue.team_id == team.id, TeamClue.clue_id == clue.id).first()
            if not tc:
                tc = TeamClue(team_id=team.id, clue_id=clue.id)
            tc.is_unlocked = True
            tc.unlocked_at = datetime.now(timezone.utc)
            db.add(tc)
    db.commit()
    return {"is_correct": corr, "points_earned": pts}


@router.get("/results")
def get_round_results(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    rnd = db.query(Round).filter(Round.phase == "quiz", Round.status == "completed").order_by(Round.round_number.desc()).first()
    if not rnd:
        rnd = db.query(Round).filter(Round.phase == "quiz", Round.status == "active").order_by(Round.round_number).first()
    if not rnd:
        return {"correct": 0, "incorrect": 0, "unanswered": 0, "total_score": 0, "clue": None}

    total_qs = db.query(Question).filter(Question.round_number == rnd.round_number).count()
    answers = db.query(Answer).join(Question).filter(Answer.team_id == team.id, Question.round_number == rnd.round_number).all()
    correct = sum(1 for a in answers if a.is_correct)
    incorrect = sum(1 for a in answers if not a.is_correct)
    total_score = sum(a.points_earned for a in answers)

    clue_text = None
    clue = db.query(Clue).filter(Clue.round_number == rnd.round_number).first()
    if clue:
        tc = db.query(TeamClue).filter(TeamClue.team_id == team.id, TeamClue.clue_id == clue.id, TeamClue.is_unlocked == True).first()
        if tc:
            clue_text = clue.clue_text

    return {
        "correct": correct,
        "incorrect": incorrect,
        "unanswered": total_qs - len(answers),
        "total_score": total_score,
        "clue": clue_text,
    }
