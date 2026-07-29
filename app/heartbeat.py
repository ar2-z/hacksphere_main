from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Team, TeamMember, Announcement, Competition, Score
from .auth import get_current_user
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api", tags=["heartbeat"])


@router.post("/heartbeat")
def heartbeat(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(User).filter(User.id == current_user.id).update({"last_seen": datetime.now(timezone.utc)})
    db.commit()
    return {"status": "ok"}


@router.get("/participants/stats")
def participants_stats(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    sixty_ago = now - timedelta(seconds=60)
    one_twenty_ago = now - timedelta(seconds=120)

    total_teams = db.query(Team).count()
    total_participants = db.query(TeamMember).count()
    active = db.query(User).filter(User.last_seen >= sixty_ago).count()
    idle = db.query(User).filter(
        User.last_seen >= one_twenty_ago, User.last_seen < sixty_ago
    ).count()
    left = db.query(User).filter(
        User.last_seen < one_twenty_ago
    ).count() + db.query(User).filter(User.last_seen.is_(None)).count()

    return {
        "total_teams": total_teams,
        "total_participants": total_participants,
        "active": active,
        "idle": idle,
        "left": left,
    }


@router.get("/participants/me")
def participants_me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    tm = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    team = db.query(Team).filter(Team.id == tm.team_id).first() if tm else None
    competition = db.query(Competition).filter(Competition.is_active == True).first()
    total_score = 0
    if team:
        scores = db.query(Score).filter(Score.team_id == team.id).all()
        total_score = sum(s.score for s in scores)
    return {
        "current_phase": competition.current_phase if competition else "registration",
        "competition_name": competition.name if competition else None,
        "team_name": team.name if team else None,
        "team_id": team.id if team else None,
        "total_score": total_score,
        "rank": None,
    }


@router.get("/announcements")
def list_public_announcements(db: Session = Depends(get_db)):
    announcements = db.query(Announcement).filter(Announcement.is_active == True).all()
    return [
        {"id": a.id, "message": a.message, "created_at": a.created_at}
        for a in announcements
    ]


@router.get("/participants")
def list_participants(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for user in users:
        tm = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
        team = db.query(Team).filter(Team.id == tm.team_id).first() if tm else None
        now = datetime.now(timezone.utc)
        if user.last_seen and user.last_seen >= now - timedelta(seconds=60):
            status = "Active"
        elif user.last_seen and user.last_seen >= now - timedelta(seconds=120):
            status = "Idle"
        elif user.last_seen:
            status = "Left"
        else:
            status = "Left"
        result.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "team_name": team.name if team else None,
            "status": status,
            "last_active": user.last_seen,
            "current_phase": None,
            "score": 0,
            "role": user.role,
        })
    return result
