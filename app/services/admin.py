from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.entities.announcement import Announcement, AnnouncementPriority
from app.domain.entities.audit import AuditLog
from app.domain.entities.competition import Competition, CompetitionPhase, CompetitionStatus
from app.domain.entities.score import Score, ScorePhase, ScoreHistory
from app.domain.entities.team import Team, TeamMember
from app.domain.entities.user import User, UserRole
from app.domain.entities.violation import Violation


class AdminService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_dashboard_stats(
        self, competition_id: int
    ) -> dict[str, Any]:
        teams_result = await self.db.execute(
            select(func.count(Team.id)).where(Team.competition_id == competition_id)
        )
        total_teams = teams_result.scalar() or 0

        members_result = await self.db.execute(
            select(func.count(TeamMember.id))
            .join(Team)
            .where(Team.competition_id == competition_id)
        )
        total_participants = members_result.scalar() or 0

        users_result = await self.db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        total_users = users_result.scalar() or 0

        violations_result = await self.db.execute(
            select(func.count(Violation.id)).where(
                Violation.competition_id == competition_id
            )
        )
        total_violations = violations_result.scalar() or 0

        scores_result = await self.db.execute(
            select(func.sum(Score.points))
            .join(Team)
            .where(Team.competition_id == competition_id)
        )
        total_points = scores_result.scalar() or 0

        competition_result = await self.db.execute(
            select(Competition).where(Competition.id == competition_id)
        )
        competition = competition_result.scalar_one_or_none()

        return {
            "competition_id": competition_id,
            "competition_name": competition.name if competition else "Unknown",
            "competition_status": competition.status.value if competition else "unknown",
            "total_teams": total_teams,
            "total_participants": total_participants,
            "total_users": total_users,
            "total_violations": total_violations,
            "total_points_awarded": total_points,
            "registered_teams": total_teams,
            "active_teams": await self._get_active_team_count(competition_id),
        }

    async def _get_active_team_count(self, competition_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Team.id)).where(
                Team.competition_id == competition_id,
                Team.is_ready == True,
            )
        )
        return result.scalar() or 0

    async def get_participants_list(
        self, competition_id: int, page: int = 1, page_size: int = 20
    ) -> dict[str, Any]:
        query = (
            select(User)
            .join(TeamMember)
            .join(Team)
            .where(Team.competition_id == competition_id)
            .distinct()
        )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        participants = []
        for user in users:
            team_result = await self.db.execute(
                select(Team)
                .join(TeamMember)
                .where(
                    TeamMember.user_id == user.id,
                    Team.competition_id == competition_id,
                )
            )
            team = team_result.scalar_one_or_none()

            participants.append({
                "user_id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "college": user.college,
                "team_id": team.id if team else None,
                "team_name": team.name if team else None,
                "is_active": user.is_active,
            })

        return {
            "competition_id": competition_id,
            "total": total,
            "page": page,
            "page_size": page_size,
            "participants": participants,
        }

    async def get_teams_overview(
        self, competition_id: int
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Team)
            .where(Team.competition_id == competition_id)
            .options(selectinload(Team.members))
            .order_by(Team.name)
        )
        teams = list(result.scalars().all())

        teams_overview = []
        for team in teams:
            scores_result = await self.db.execute(
                select(func.sum(Score.points)).where(Score.team_id == team.id)
            )
            total_score = scores_result.scalar() or 0

            violations_result = await self.db.execute(
                select(func.count(Violation.id)).where(
                    Violation.team_id == team.id
                )
            )
            violation_count = violations_result.scalar() or 0

            teams_overview.append({
                "team_id": team.id,
                "team_name": team.name,
                "team_code": team.team_code,
                "member_count": team.member_count,
                "max_members": team.max_members,
                "is_ready": team.is_ready,
                "total_score": total_score,
                "violation_count": violation_count,
                "presentation_order": team.presentation_order,
            })

        return teams_overview

    async def create_announcement(
        self,
        competition_id: int,
        title: str,
        content: str,
        priority: AnnouncementPriority = AnnouncementPriority.NORMAL,
        is_pinned: bool = False,
        is_broadcast: bool = True,
        target_team_id: int | None = None,
        created_by: int | None = None,
    ) -> Announcement:
        announcement = Announcement(
            competition_id=competition_id,
            title=title,
            content=content,
            priority=priority,
            is_pinned=is_pinned,
            is_broadcast=is_broadcast,
            target_team_id=target_team_id,
            created_by=created_by or 0,
        )
        self.db.add(announcement)
        await self.db.flush()
        await self.db.refresh(announcement)
        return announcement

    async def get_announcements(
        self, competition_id: int
    ) -> list[Announcement]:
        result = await self.db.execute(
            select(Announcement)
            .where(Announcement.competition_id == competition_id)
            .order_by(
                Announcement.is_pinned.desc(),
                Announcement.created_at.desc(),
            )
        )
        return list(result.scalars().all())

    async def update_announcement(
        self, announcement_id: int, **kwargs: dict
    ) -> Announcement:
        result = await self.db.execute(
            select(Announcement).where(Announcement.id == announcement_id)
        )
        announcement = result.scalar_one_or_none()

        if not announcement:
            raise ValueError("Announcement not found")

        for key, value in kwargs.items():
            if hasattr(announcement, key) and value is not None:
                setattr(announcement, key, value)

        await self.db.flush()
        await self.db.refresh(announcement)
        return announcement

    async def delete_announcement(self, announcement_id: int) -> bool:
        result = await self.db.execute(
            select(Announcement).where(Announcement.id == announcement_id)
        )
        announcement = result.scalar_one_or_none()

        if not announcement:
            return False

        await self.db.delete(announcement)
        await self.db.flush()
        return True

    async def log_audit(
        self,
        user_id: int,
        action: str,
        resource_type: str,
        resource_id: int | None = None,
        details: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        status: str = "success",
    ) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def get_audit_logs(
        self,
        competition_id: int | None = None,
        user_id: int | None = None,
        action: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        query = select(AuditLog)

        if user_id:
            query = query.where(AuditLog.user_id == user_id)

        if action:
            query = query.where(AuditLog.action == action)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.order_by(AuditLog.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        logs = list(result.scalars().all())

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "logs": [
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "action": log.action,
                    "resource_type": log.resource_type,
                    "resource_id": log.resource_id,
                    "details": log.details,
                    "ip_address": log.ip_address,
                    "status": log.status,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ],
        }

    async def get_analytics(
        self, competition_id: int
    ) -> dict[str, Any]:
        dashboard = await self.get_dashboard_stats(competition_id)

        scores_result = await self.db.execute(
            select(
                Score.phase,
                func.sum(Score.points).label("total"),
                func.avg(Score.points).label("average"),
                func.count(Score.id).label("count"),
            )
            .join(Team)
            .where(Team.competition_id == competition_id)
            .group_by(Score.phase)
        )
        phase_scores = list(scores_result.all())

        phase_analytics = {}
        for ps in phase_scores:
            phase_analytics[ps.phase.value] = {
                "total": ps.total,
                "average": round(ps.average, 2) if ps.average else 0,
                "count": ps.count,
            }

        teams_result = await self.db.execute(
            select(Team.id).where(Team.competition_id == competition_id)
        )
        team_ids = [row[0] for row in teams_result.all()]

        score_distribution = {"0-100": 0, "101-200": 0, "201-300": 0, "301-500": 0, "500+": 0}

        for team_id in team_ids:
            total_result = await self.db.execute(
                select(func.sum(Score.points)).where(Score.team_id == team_id)
            )
            total = total_result.scalar() or 0

            if total <= 100:
                score_distribution["0-100"] += 1
            elif total <= 200:
                score_distribution["101-200"] += 1
            elif total <= 300:
                score_distribution["201-300"] += 1
            elif total <= 500:
                score_distribution["301-500"] += 1
            else:
                score_distribution["500+"] += 1

        violations_result = await self.db.execute(
            select(
                Violation.violation_type,
                func.count(Violation.id).label("count"),
            )
            .where(Violation.competition_id == competition_id)
            .group_by(Violation.violation_type)
        )
        violation_types = {row.violation_type.value: row.count for row in violations_result.all()}

        return {
            "competition_id": competition_id,
            "overview": dashboard,
            "phase_analytics": phase_analytics,
            "score_distribution": score_distribution,
            "violation_types": violation_types,
        }

    async def override_team_score(
        self,
        team_id: int,
        phase: ScorePhase,
        points: float,
        reason: str,
        awarded_by: int,
    ) -> Score:
        score = Score(
            team_id=team_id,
            phase=phase,
            points=points,
            description=f"Admin override: {reason}",
            awarded_by=awarded_by,
        )
        self.db.add(score)
        await self.db.flush()
        await self.db.refresh(score)
        return score

    async def bulk_action_teams(
        self,
        competition_id: int,
        team_ids: list[int],
        action: str,
    ) -> dict[str, Any]:
        results = {"success": 0, "failed": 0}

        for team_id in team_ids:
            try:
                team_result = await self.db.execute(
                    select(Team).where(Team.id == team_id)
                )
                team = team_result.scalar_one_or_none()

                if not team:
                    results["failed"] += 1
                    continue

                if action == "disqualify":
                    for member in team.members:
                        member.user.is_active = False
                    results["success"] += 1
                elif action == "activate":
                    team.is_ready = True
                    results["success"] += 1
                else:
                    results["failed"] += 1
            except Exception:
                results["failed"] += 1

        await self.db.flush()
        return results
