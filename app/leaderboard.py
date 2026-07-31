from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .cache import ttl_cache
from .models import Team, Score, TeamMember
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("")
@ttl_cache(ttl_seconds=5)
def get_leaderboard(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for team in teams:
        scores = db.query(Score).filter(Score.team_id == team.id).all()
        total_score = sum(s.score for s in scores)
        quiz_score = next((s.score for s in scores if s.phase == "quiz"), 0)
        debug_score = next((s.score for s in scores if s.phase == "debug"), 0)
        ideathon_score = next((s.score for s in scores if s.phase == "ideathon"), 0)
        member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
        result.append({
            "rank": 0,
            "team_name": team.name,
            "quiz_score": quiz_score,
            "debug_score": debug_score,
            "ideathon_score": ideathon_score,
            "total_score": total_score,
            "member_count": member_count,
        })

    result.sort(key=lambda x: x["total_score"], reverse=True)
    for i, entry in enumerate(result, start=1):
        entry["rank"] = i

    return result


@router.get("/team/{team_id}")
def get_team_leaderboard(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    scores = db.query(Score).filter(Score.team_id == team.id).all()
    total_score = sum(s.score for s in scores)
    member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()

    return {
        "team_id": team.id,
        "team_name": team.name,
        "quiz_score": next((s.score for s in scores if s.phase == "quiz"), 0),
        "debug_score": next((s.score for s in scores if s.phase == "debug"), 0),
        "ideathon_score": next((s.score for s in scores if s.phase == "ideathon"), 0),
        "total_score": total_score,
        "member_count": member_count,
    }
