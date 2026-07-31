import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from .database import get_db
from .models import IdeathonProblem, IdeathonSubmission, TeamMember, Team, Round, Competition
from .schemas import IdeathonSubmit
from .auth import get_current_user
from .config import settings
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api/ideathon", tags=["ideathon"])

def get_user_team(user, db):
    tm = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if not tm:
        raise HTTPException(403, "Not a member of any team")
    return db.query(Team).filter(Team.id == tm.team_id).first()

@router.get("/problem")
def get_problem(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    p = db.query(IdeathonProblem).filter(IdeathonProblem.team_id == team.id).first()
    if not p:
        raise HTTPException(404, "No problem assigned")
    return {"problem_id": p.id, "problem_statement": p.problem_statement}

@router.get("/submission")
def get_submission(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    s = db.query(IdeathonSubmission).filter(IdeathonSubmission.team_id == team.id).first()
    if not s:
        raise HTTPException(404, "No submission found")
    return {"submission_id": s.id, "idea_summary": s.idea_summary, "file_path": s.file_path, "ready_at": s.ready_at.isoformat() if s.ready_at else None, "presentation_slot": s.presentation_slot}

@router.post("/submit")
def submit_idea(summary: str = Form(...), file: UploadFile = File(None), user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    existing = db.query(IdeathonSubmission).filter(IdeathonSubmission.team_id == team.id).first()
    if existing and existing.ready_at:
        raise HTTPException(400, "Submission already locked")
    file_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in (".pdf", ".ppt", ".pptx"):
            raise HTTPException(400, "Only PDF and PPT files are allowed")
        content = file.file.read()
        if len(content) > settings.max_upload_size_mb * 1024 * 1024:
            raise HTTPException(400, "File exceeds 20MB limit")
        os.makedirs(settings.upload_dir, exist_ok=True)
        upload_root = os.path.abspath(settings.upload_dir)
        stored_name = f"team_{team.id}_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(upload_root, stored_name)
        if os.path.commonpath([upload_root, os.path.abspath(file_path)]) != upload_root:
            raise HTTPException(400, "Invalid file path")
        with open(file_path, "wb") as f:
            f.write(content)
    if existing:
        existing.idea_summary = summary
        if file_path:
            existing.file_path = file_path
    else:
        existing = IdeathonSubmission(team_id=team.id, idea_summary=summary, file_path=file_path)
    db.add(existing)
    db.commit()
    db.refresh(existing)
    return {"submission_id": existing.id, "idea_summary": existing.idea_summary, "file_path": existing.file_path}

@router.post("/ready")
def mark_ready(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    s = db.query(IdeathonSubmission).filter(IdeathonSubmission.team_id == team.id).first()
    if not s:
        raise HTTPException(400, "No submission to lock")
    if s.ready_at:
        raise HTTPException(400, "Already marked ready")
    max_slot = db.query(IdeathonSubmission.presentation_slot).filter(IdeathonSubmission.presentation_slot.isnot(None)).order_by(IdeathonSubmission.presentation_slot.desc()).first()
    s.ready_at = datetime.utcnow()
    s.presentation_slot = (max_slot[0] if max_slot and max_slot[0] else 0) + 1
    db.commit()
    db.refresh(s)
    return {"submission_id": s.id, "ready_at": s.ready_at.isoformat() if s.ready_at else None, "presentation_slot": s.presentation_slot}

@router.get("/presentation-order")
def presentation_order(user=Depends(get_current_user), db: Session = Depends(get_db)):
    subs = db.query(IdeathonSubmission).filter(IdeathonSubmission.presentation_slot.isnot(None)).order_by(IdeathonSubmission.presentation_slot).all()
    result = []
    for s in subs:
        team = db.query(Team).filter(Team.id == s.team_id).first()
        result.append({"team_id": s.team_id, "team_name": team.name if team else None, "presentation_slot": s.presentation_slot})
    return result


@router.get("/status")
def ideathon_status(user=Depends(get_current_user), db: Session = Depends(get_db)):
    team = get_user_team(user, db)
    rnd = db.query(Round).filter(Round.phase == "ideathon", Round.status == "active").first()
    problem = db.query(IdeathonProblem).filter(IdeathonProblem.team_id == team.id).first()
    submission = db.query(IdeathonSubmission).filter(IdeathonSubmission.team_id == team.id).first()
    return {
        "status": rnd.status if rnd else "inactive",
        "problem_statement": problem.problem_statement if problem else None,
        "submitted": submission is not None,
        "presentation_slot": submission.presentation_slot if submission else None,
        "ready_at": submission.ready_at.isoformat() if submission and submission.ready_at else None,
    }
