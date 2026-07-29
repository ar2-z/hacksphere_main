import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Team, TeamMember, Round, Competition, Score, Violation, Announcement, IdeathonSubmission, IdeathonProblem, Question, DebugChallenge, DebugSubmission
from .schemas import AnnouncementCreate
from .auth import get_current_user, require_role
from datetime import datetime, timedelta, timezone

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_role(["admin", "super_admin"]))],
)


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    sixty_ago = now - timedelta(seconds=60)
    one_twenty_ago = now - timedelta(seconds=120)

    total_teams = db.query(Team).count()
    total_participants = db.query(TeamMember).count()
    total_violations = db.query(Violation).count()

    active_users = db.query(User).filter(User.last_seen >= sixty_ago).count()
    idle_users = db.query(User).filter(
        User.last_seen >= one_twenty_ago, User.last_seen < sixty_ago
    ).count()
    left_users = db.query(User).filter(
        User.last_seen < one_twenty_ago
    ).count() + db.query(User).filter(User.last_seen.is_(None)).count()

    competition = db.query(Competition).filter(Competition.is_active.is_(True)).first()
    current_phase = competition.current_phase if competition else None

    return {
        "total_teams": total_teams,
        "total_participants": total_participants,
        "active_users": active_users,
        "idle_users": idle_users,
        "left_users": left_users,
        "total_violations": total_violations,
        "current_phase": current_phase,
    }


@router.get("/teams")
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for team in teams:
        members = []
        for tm in team.members:
            members.append({
                "id": tm.user.id,
                "username": tm.user.username,
                "full_name": tm.user.full_name,
                "last_seen": tm.user.last_seen,
                "is_active": tm.user.is_active,
            })
        result.append({
            "id": team.id,
            "name": team.name,
            "status": team.status,
            "is_eliminated": team.is_eliminated,
            "leader_id": team.leader_id,
            "invite_code": team.invite_code,
            "members": members,
        })
    return result


@router.get("/teams/{team_id}")
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    members = []
    for tm in team.members:
        members.append({
            "id": tm.user.id,
            "username": tm.user.username,
            "full_name": tm.user.full_name,
            "last_seen": tm.user.last_seen,
            "is_active": tm.user.is_active,
        })
    return {
        "id": team.id,
        "name": team.name,
        "status": team.status,
        "is_eliminated": team.is_eliminated,
        "leader_id": team.leader_id,
        "invite_code": team.invite_code,
        "members": members,
    }


@router.post("/teams/{team_id}/action")
def team_action(team_id: int, body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    action = body.get("action")
    description = body.get("description", "")

    if action == "warn":
        violation = Violation(
            team_id=team_id,
            user_id=current_user.id,
            violation_type="warn",
            description=description,
        )
        db.add(violation)
        db.commit()
        return {"detail": "Team warned successfully"}

    elif action == "kick":
        violation = Violation(
            team_id=team_id,
            user_id=current_user.id,
            violation_type="kick",
            description=description,
        )
        db.add(violation)
        db.query(Team).filter(Team.id == team_id).update({"status": "kicked"})
        for tm in team.members:
            db.query(User).filter(User.id == tm.user_id).update({"is_active": False})
        db.commit()
        return {"detail": "Team kicked successfully"}

    elif action == "disqualify":
        violation = Violation(
            team_id=team_id,
            user_id=current_user.id,
            violation_type="disqualify",
            description=description,
        )
        db.add(violation)
        db.query(Team).filter(Team.id == team_id).update({"is_eliminated": True})
        db.commit()
        return {"detail": "Team disqualified successfully"}

    raise HTTPException(status_code=400, detail="Invalid action")


@router.post("/participants/{user_id}/{action}")
def participant_action(user_id: int, action: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if action == "warn":
        v = Violation(user_id=user_id, violation_type="warn", description="Warned by admin")
        db.add(v)
    elif action == "kick":
        v = Violation(user_id=user_id, violation_type="kick", description="Kicked by admin")
        db.add(v)
        user.is_active = False
    elif action == "disqualify":
        v = Violation(user_id=user_id, violation_type="disqualify", description="Disqualified by admin")
        db.add(v)
        user.is_active = False
        for tm in db.query(TeamMember).filter(TeamMember.user_id == user_id).all():
            db.query(Team).filter(Team.id == tm.team_id).update({"is_eliminated": True})
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    db.commit()
    return {"detail": f"User {action} successful"}

@router.post("/teams/{team_id}/{action}")
def team_action_url(team_id: int, action: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if action == "warn":
        v = Violation(team_id=team_id, user_id=current_user.id, violation_type="warn", description="Warned by admin")
        db.add(v)
    elif action == "kick":
        v = Violation(team_id=team_id, user_id=current_user.id, violation_type="kick", description="Kicked by admin")
        db.add(v)
        db.query(Team).filter(Team.id == team_id).update({"status": "kicked"})
        for tm in team.members:
            db.query(User).filter(User.id == tm.user_id).update({"is_active": False})
    elif action == "disqualify":
        v = Violation(team_id=team_id, user_id=current_user.id, violation_type="disqualify", description="Disqualified by admin")
        db.add(v)
        db.query(Team).filter(Team.id == team_id).update({"is_eliminated": True})
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    db.commit()
    return {"detail": f"Team {action} successful"}


@router.post("/rounds/quiz/start/{round_number}")
def start_quiz_round(round_number: int, db: Session = Depends(get_db)):
    round_ = db.query(Round).filter(
        Round.phase == "quiz", Round.round_number == round_number
    ).first()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found")
    round_.status = "active"
    round_.started_at = datetime.now(timezone.utc)
    db.query(Competition).filter(Competition.is_active.is_(True)).update({"current_phase": "quiz"})
    db.commit()
    return {"detail": f"Quiz round {round_number} started"}


@router.post("/rounds/quiz/pause/{round_number}")
def pause_quiz_round(round_number: int, db: Session = Depends(get_db)):
    round_ = db.query(Round).filter(
        Round.phase == "quiz", Round.round_number == round_number
    ).first()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found")
    round_.status = "paused"
    db.commit()
    return {"detail": f"Quiz round {round_number} paused"}


@router.post("/rounds/quiz/resume/{round_number}")
def resume_quiz_round(round_number: int, db: Session = Depends(get_db)):
    round_ = db.query(Round).filter(
        Round.phase == "quiz", Round.round_number == round_number
    ).first()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found")
    round_.status = "active"
    db.commit()
    return {"detail": f"Quiz round {round_number} resumed"}


@router.post("/rounds/quiz/end/{round_number}")
def end_quiz_round(round_number: int, db: Session = Depends(get_db)):
    round_ = db.query(Round).filter(
        Round.phase == "quiz", Round.round_number == round_number
    ).first()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found")
    round_.status = "completed"
    db.commit()
    return {"detail": f"Quiz round {round_number} ended"}


@router.post("/rounds/{round_number}/next-phase")
def next_phase(round_number: int, db: Session = Depends(get_db)):
    db.query(Competition).filter(Competition.is_active.is_(True)).update({"current_phase": "debugging"})
    db.commit()
    return {"detail": "Phase changed to debugging"}


@router.post("/rounds/debug/start/{round_number}")
def start_debug_round(round_number: int, db: Session = Depends(get_db)):
    round_ = db.query(Round).filter(
        Round.phase == "debug", Round.round_number == round_number
    ).first()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found")
    round_.status = "active"
    round_.started_at = datetime.now(timezone.utc)
    db.query(Competition).filter(Competition.is_active.is_(True)).update({"current_phase": "debugging"})
    db.commit()
    return {"detail": f"Debug round {round_number} started"}


@router.post("/rounds/debug/end/{round_number}")
def end_debug_round(round_number: int, db: Session = Depends(get_db)):
    round_ = db.query(Round).filter(
        Round.phase == "debug", Round.round_number == round_number
    ).first()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found")
    round_.status = "completed"
    db.commit()
    return {"detail": f"Debug round {round_number} ended"}


@router.get("/ideathon/submissions")
def list_ideathon_submissions(db: Session = Depends(get_db)):
    submissions = db.query(IdeathonSubmission).all()
    result = []
    for sub in submissions:
        team = db.query(Team).filter(Team.id == sub.team_id).first()
        result.append({
            "id": sub.id,
            "team_id": sub.team_id,
            "team_name": team.name if team else None,
            "idea_summary": sub.idea_summary,
            "file_path": sub.file_path,
            "presentation_slot": sub.presentation_slot,
            "ready_at": sub.ready_at,
        })
    return result


@router.post("/ideathon/score/{team_id}")
def score_ideathon(team_id: int, body: dict, db: Session = Depends(get_db)):
    score_value = body.get("score")
    if score_value is None:
        raise HTTPException(status_code=400, detail="score is required")
    existing = db.query(Score).filter(
        Score.team_id == team_id, Score.phase == "ideathon"
    ).first()
    if existing:
        existing.score = score_value
    else:
        score = Score(team_id=team_id, phase="ideathon", score=score_value)
        db.add(score)
    db.commit()
    return {"detail": "Ideathon score saved"}


@router.get("/ideathon/presentation-order")
def get_presentation_order(db: Session = Depends(get_db)):
    submissions = db.query(IdeathonSubmission).filter(
        IdeathonSubmission.presentation_slot.isnot(None)
    ).order_by(IdeathonSubmission.presentation_slot).all()
    result = []
    for sub in submissions:
        team = db.query(Team).filter(Team.id == sub.team_id).first()
        result.append({
            "team_id": sub.team_id,
            "team_name": team.name if team else None,
            "presentation_slot": sub.presentation_slot,
        })
    return result


@router.get("/announcements")
def list_announcements(db: Session = Depends(get_db)):
    announcements = db.query(Announcement).filter(Announcement.is_active.is_(True)).all()
    return [
        {"id": a.id, "message": a.message, "created_at": a.created_at}
        for a in announcements
    ]


@router.post("/announcements")
def create_announcement(body: AnnouncementCreate, db: Session = Depends(get_db)):
    announcement = Announcement(message=body.message)
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return {"id": announcement.id, "message": announcement.message, "created_at": announcement.created_at}


@router.delete("/announcements/{announcement_id}")
def delete_announcement(announcement_id: int, db: Session = Depends(get_db)):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    announcement.is_active = False
    db.commit()
    return {"detail": "Announcement deactivated"}


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for team in teams:
        scores = db.query(Score).filter(Score.team_id == team.id).all()
        total = sum(s.score for s in scores)
        quiz_score = next((s.score for s in scores if s.phase == "quiz"), 0)
        debug_score = next((s.score for s in scores if s.phase == "debug"), 0)
        ideathon_score = next((s.score for s in scores if s.phase == "ideathon"), 0)
        result.append({
            "team_id": team.id,
            "team_name": team.name,
            "quiz_score": quiz_score,
            "debug_score": debug_score,
            "ideathon_score": ideathon_score,
            "total_score": total,
        })
    result.sort(key=lambda x: x["total_score"], reverse=True)
    for i, entry in enumerate(result, start=1):
        entry["rank"] = i
    return result


@router.get("/violations")
def list_violations(db: Session = Depends(get_db)):
    violations = db.query(Violation).all()
    result = []
    for v in violations:
        team = db.query(Team).filter(Team.id == v.team_id).first() if v.team_id else None
        user = db.query(User).filter(User.id == v.user_id).first() if v.user_id else None
        result.append({
            "id": v.id,
            "team_id": v.team_id,
            "team_name": team.name if team else None,
            "user_id": v.user_id,
            "username": user.username if user else None,
            "type": v.violation_type,
            "description": v.description,
            "created_at": v.created_at,
        })
    return result

@router.get("/quiz/rounds")
def list_quiz_rounds(db: Session = Depends(get_db)):
    rounds = db.query(Round).filter(Round.phase == "quiz").order_by(Round.round_number).all()
    return [{"round_number": r.round_number, "status": r.status, "time_limit_minutes": r.time_limit_minutes} for r in rounds]

@router.post("/quiz/round/{round_number}/{action}")
def quiz_round_action(round_number: int, action: str, db: Session = Depends(get_db)):
    rnd = db.query(Round).filter(Round.phase == "quiz", Round.round_number == round_number).first()
    if not rnd:
        raise HTTPException(404, "Round not found")
    if action == "start":
        rnd.status = "active"
        rnd.started_at = datetime.now(timezone.utc)
        db.query(Competition).filter(Competition.is_active == True).update({"current_phase": "quiz"})
    elif action == "pause":
        rnd.status = "paused"
    elif action == "resume":
        rnd.status = "active"
    elif action == "end":
        rnd.status = "completed"
    else:
        raise HTTPException(400, "Invalid action")
    db.commit()
    return {"detail": f"Quiz round {round_number} {action}ed"}

@router.post("/quiz/questions")
def create_question(body: dict, db: Session = Depends(get_db)):
    opt_map = {"A": 0, "B": 1, "C": 2, "D": 3}
    correct_answer = opt_map.get(body.get("correct_answer", "A").upper(), 0)
    options = json.dumps([
        body.get("option_a", ""),
        body.get("option_b", ""),
        body.get("option_c", ""),
        body.get("option_d", ""),
    ])
    q = Question(
        round_number=body.get("round_number", 1),
        question_text=body.get("question_text", ""),
        options=options,
        correct_answer=correct_answer,
        difficulty=body.get("difficulty", "medium"),
        points=body.get("points", 10),
        time_limit_seconds=body.get("time_limit_seconds", 30),
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"id": q.id, "question_text": q.question_text}

@router.get("/quiz/questions")
def list_questions(db: Session = Depends(get_db)):
    qs = db.query(Question).order_by(Question.round_number, Question.id).all()
    result = []
    for q in qs:
        opts = q.options
        if isinstance(opts, str):
            opts = json.loads(opts)
        result.append({
            "id": q.id,
            "round_number": q.round_number,
            "question_text": q.question_text,
            "option_a": opts[0] if len(opts) > 0 else "",
            "option_b": opts[1] if len(opts) > 1 else "",
            "option_c": opts[2] if len(opts) > 2 else "",
            "option_d": opts[3] if len(opts) > 3 else "",
            "correct_answer": chr(65 + q.correct_answer),
            "difficulty": q.difficulty,
            "points": q.points,
            "time_limit_seconds": q.time_limit_seconds,
        })
    return result

@router.delete("/quiz/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    db.delete(q)
    db.commit()
    return {"detail": "Question deleted"}

@router.get("/quiz/scores")
def get_quiz_scores(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for team in teams:
        correct = 0
        incorrect = 0
        total = 0
        for a in team.answers:
            if a.is_correct:
                correct += 1
                total += a.points_earned
            else:
                incorrect += 1
        score_entry = db.query(Score).filter(Score.team_id == team.id, Score.phase == "quiz").first()
        if score_entry:
            total = score_entry.score
        result.append({
            "team_name": team.name,
            "correct": correct,
            "incorrect": incorrect,
            "total_score": total,
        })
    return result

@router.get("/debug/rounds")
def list_debug_rounds(db: Session = Depends(get_db)):
    rounds = db.query(Round).filter(Round.phase == "debug").order_by(Round.round_number).all()
    return [{"round_number": r.round_number, "status": r.status, "time_limit_minutes": r.time_limit_minutes} for r in rounds]

@router.post("/debug/round/{round_number}/{action}")
def debug_round_action(round_number: int, action: str, db: Session = Depends(get_db)):
    rnd = db.query(Round).filter(Round.phase == "debug", Round.round_number == round_number).first()
    if not rnd:
        raise HTTPException(404, "Round not found")
    if action == "start":
        rnd.status = "active"
        rnd.started_at = datetime.now(timezone.utc)
        db.query(Competition).filter(Competition.is_active == True).update({"current_phase": "debugging"})
    elif action == "end":
        rnd.status = "completed"
    else:
        raise HTTPException(400, "Invalid action")
    db.commit()
    return {"detail": f"Debug round {round_number} {action}ed"}

@router.post("/debug/challenges")
def create_challenge(body: dict, db: Session = Depends(get_db)):
    c = DebugChallenge(
        round_number=body.get("round_number", 1),
        title=body.get("title", ""),
        description=body.get("description", ""),
        buggy_code=body.get("buggy_code", ""),
        public_tests=body.get("public_tests", []),
        hidden_tests=body.get("hidden_tests", []),
        difficulty=body.get("difficulty", "medium"),
        points=body.get("points", 50),
        time_limit_minutes=body.get("time_limit_minutes", 10),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "title": c.title}

@router.get("/debug/challenges")
def list_challenges(db: Session = Depends(get_db)):
    cs = db.query(DebugChallenge).order_by(DebugChallenge.round_number, DebugChallenge.id).all()
    return [{
        "id": c.id, "round_number": c.round_number, "title": c.title,
        "description": c.description[:100] + "..." if len(c.description) > 100 else c.description,
        "difficulty": c.difficulty, "points": c.points, "time_limit_minutes": c.time_limit_minutes,
    } for c in cs]

@router.delete("/debug/challenges/{challenge_id}")
def delete_challenge(challenge_id: int, db: Session = Depends(get_db)):
    c = db.query(DebugChallenge).filter(DebugChallenge.id == challenge_id).first()
    if not c:
        raise HTTPException(404, "Challenge not found")
    db.delete(c)
    db.commit()
    return {"detail": "Challenge deleted"}

@router.get("/ideathon/teams")
def list_ideathon_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for team in teams:
        problem = db.query(IdeathonProblem).filter(IdeathonProblem.team_id == team.id).first()
        submission = db.query(IdeathonSubmission).filter(IdeathonSubmission.team_id == team.id).first()
        score_entry = db.query(Score).filter(Score.team_id == team.id, Score.phase == "ideathon").first()
        result.append({
            "id": team.id,
            "team_name": team.name,
            "problem_statement": problem.problem_statement if problem else None,
            "idea_summary": submission.idea_summary if submission else None,
            "file_url": f"/api/uploads/{submission.file_path.split('/')[-1]}" if submission and submission.file_path else None,
            "score": score_entry.score if score_entry else None,
            "is_ready": submission.ready_at is not None if submission else False,
        })
    return result


@router.post("/ideathon/presentation/move/{team_id}")
def move_presentation_slot(team_id: int, body: dict, db: Session = Depends(get_db)):
    direction = body.get("direction", "down")
    sub = db.query(IdeathonSubmission).filter(IdeathonSubmission.team_id == team_id).first()
    if not sub or not sub.presentation_slot:
        raise HTTPException(404, "Team has no presentation slot")
    current_slot = sub.presentation_slot
    if direction == "up":
        other = db.query(IdeathonSubmission).filter(IdeathonSubmission.presentation_slot == current_slot - 1).first()
    else:
        other = db.query(IdeathonSubmission).filter(IdeathonSubmission.presentation_slot == current_slot + 1).first()
    if not other:
        raise HTTPException(400, "Cannot move further")
    sub.presentation_slot, other.presentation_slot = other.presentation_slot, sub.presentation_slot
    db.commit()
    return {"detail": "Slot moved"}

@router.post("/quiz/start")
def admin_quiz_start(db: Session = Depends(get_db)):
    rnd = db.query(Round).filter(Round.phase == "quiz", Round.status != "completed").order_by(Round.round_number).first()
    if not rnd:
        rnd = db.query(Round).filter(Round.phase == "quiz").order_by(Round.round_number).first()
    if rnd:
        rnd.status = "active"
        rnd.started_at = datetime.now(timezone.utc)
    db.query(Competition).filter(Competition.is_active == True).update({"current_phase": "quiz"})
    db.commit()
    return {"detail": "Quiz started"}

@router.post("/quiz/pause")
def admin_quiz_pause(db: Session = Depends(get_db)):
    for rnd in db.query(Round).filter(Round.phase == "quiz", Round.status == "active").all():
        rnd.status = "paused"
    db.commit()
    return {"detail": "Quiz paused"}

@router.post("/quiz/end")
def admin_quiz_end(db: Session = Depends(get_db)):
    for rnd in db.query(Round).filter(Round.phase == "quiz", Round.status.in_(["active", "paused"])).all():
        rnd.status = "completed"
    db.commit()
    return {"detail": "Quiz ended"}

@router.post("/debug/start")
def admin_debug_start(db: Session = Depends(get_db)):
    rnd = db.query(Round).filter(Round.phase == "debug", Round.status != "completed").order_by(Round.round_number).first()
    if not rnd:
        rnd = db.query(Round).filter(Round.phase == "debug").order_by(Round.round_number).first()
    if rnd:
        rnd.status = "active"
        rnd.started_at = datetime.now(timezone.utc)
    db.query(Competition).filter(Competition.is_active == True).update({"current_phase": "debugging"})
    db.commit()
    return {"detail": "Debug started"}

@router.post("/debug/pause")
def admin_debug_pause(db: Session = Depends(get_db)):
    for rnd in db.query(Round).filter(Round.phase == "debug", Round.status == "active").all():
        rnd.status = "paused"
    db.commit()
    return {"detail": "Debug paused"}

@router.post("/debug/end")
def admin_debug_end(db: Session = Depends(get_db)):
    for rnd in db.query(Round).filter(Round.phase == "debug", Round.status.in_(["active", "paused"])).all():
        rnd.status = "completed"
    db.commit()
    return {"detail": "Debug ended"}

@router.post("/ideathon/start")
def admin_ideathon_start(db: Session = Depends(get_db)):
    db.query(Competition).filter(Competition.is_active == True).update({"current_phase": "ideathon"})
    db.commit()
    return {"detail": "Ideathon started"}

@router.post("/ideathon/end")
def admin_ideathon_end(db: Session = Depends(get_db)):
    db.query(Competition).filter(Competition.is_active == True).update({"current_phase": "completed"})
    db.commit()
    return {"detail": "Ideathon ended"}
