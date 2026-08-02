import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import Team, TeamMember, User, Competition
from .schemas import TeamCreate, TeamJoin
from .auth import get_current_user

router = APIRouter(prefix="/api/teams", tags=["teams"])

def ensure_user_team(db: Session, user, team_name: str = None) -> Team:
    """Each login is its own single-member team. Auto-create one if the user has none."""
    tm = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if tm:
        team = db.query(Team).filter(Team.id == tm.team_id).first()
        if team:
            name = (team_name or "").strip()
            if name and team.name != name:
                team.name = name
                db.commit()
            return team
    competition = db.query(Competition).filter(Competition.is_active == True).first()
    competition_id = competition.id if competition else 1
    invite_code = secrets.token_hex(4).upper()
    while db.query(Team).filter(Team.invite_code == invite_code).first():
        invite_code = secrets.token_hex(4).upper()
    name = (team_name or "").strip() or user.username
    team = Team(
        name=name,
        competition_id=competition_id,
        leader_id=user.id,
        invite_code=invite_code,
    )
    db.add(team)
    db.flush()
    db.add(TeamMember(team_id=team.id, user_id=user.id))
    db.commit()
    db.refresh(team)
    return team

@router.post("/create")
def create_team(data: TeamCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if existing:
        raise HTTPException(400, "Already in a team")
    competition = db.query(Competition).filter(Competition.is_active == True).first()
    if not competition:
        raise HTTPException(400, "No active competition")
    invite_code = secrets.token_hex(4).upper()
    while db.query(Team).filter(Team.invite_code == invite_code).first():
        invite_code = secrets.token_hex(4).upper()
    team = Team(name=data.name, competition_id=competition.id, leader_id=user.id, invite_code=invite_code)
    db.add(team)
    db.flush()
    tm = TeamMember(team_id=team.id, user_id=user.id)
    db.add(tm)
    db.commit()
    db.refresh(team)
    return {"team_id": team.id, "name": team.name, "invite_code": team.invite_code}

@router.post("/join")
def join_team(data: TeamJoin, user=Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if existing:
        raise HTTPException(400, "Already in a team")
    team = db.query(Team).filter(Team.invite_code == data.invite_code.upper()).first()
    if not team:
        raise HTTPException(404, "Invalid invite code")
    if team.is_eliminated:
        raise HTTPException(400, "Team is eliminated")
    tm = TeamMember(team_id=team.id, user_id=user.id)
    db.add(tm)
    db.commit()
    return {"team_id": team.id, "name": team.name}

@router.get("/my")
def my_team(user=Depends(get_current_user), db: Session = Depends(get_db)):
    tm = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if not tm:
        raise HTTPException(404, "Not in a team")
    team = db.query(Team).filter(Team.id == tm.team_id).first()
    members = []
    for m in team.members:
        members.append({
            "id": m.user.id,
            "username": m.user.username,
            "full_name": m.user.full_name,
            "role": m.user.role if m.user.id == team.leader_id else "member",
            "last_seen": m.user.last_seen.isoformat() if m.user.last_seen else None,
        })
    return {
        "id": team.id,
        "name": team.name,
        "invite_code": team.invite_code,
        "is_eliminated": team.is_eliminated,
        "leader_id": team.leader_id,
        "members": members,
    }

@router.post("/leave")
def leave_team(user=Depends(get_current_user), db: Session = Depends(get_db)):
    tm = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
    if not tm:
        raise HTTPException(404, "Not in a team")
    team = db.query(Team).filter(Team.id == tm.team_id).first()
    if team.leader_id == user.id:
        raise HTTPException(400, "Team leader cannot leave. Delete the team instead.")
    db.delete(tm)
    db.commit()
    return {"detail": "Left team successfully"}

@router.get("")
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for team in teams:
        result.append({
            "id": team.id,
            "name": team.name,
            "leader_id": team.leader_id,
            "member_count": len(team.members),
            "is_eliminated": team.is_eliminated,
            "status": team.status,
        })
    return result
