from __future__ import annotations

import secrets
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.team import Team, TeamMember, TeamMemberRole
from app.domain.entities.user import User, UserRole


class TeamService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def generate_team_code(self) -> str:
        return secrets.token_hex(4).upper()

    async def create_team(
        self,
        name: str,
        competition_id: int,
        creator: User,
        description: str | None = None,
        max_members: int = 4,
    ) -> Team:
        existing = await self.db.execute(
            select(Team).where(
                Team.name == name,
                Team.competition_id == competition_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Team name already exists in this competition")

        team = Team(
            name=name,
            description=description,
            team_code=self.generate_team_code(),
            competition_id=competition_id,
            max_members=max_members,
        )
        self.db.add(team)
        await self.db.flush()

        member = TeamMember(
            team_id=team.id,
            user_id=creator.id,
            role=TeamMemberRole.LEADER,
        )
        self.db.add(member)

        creator.role = UserRole.TEAM_LEADER
        await self.db.flush()
        await self.db.refresh(team)

        return team

    async def join_team(
        self, team_code: str, user: User
    ) -> Team:
        result = await self.db.execute(
            select(Team).where(Team.team_code == team_code)
        )
        team = result.scalar_one_or_none()

        if team is None:
            raise ValueError("Invalid team code")

        if team.member_count >= team.max_members:
            raise ValueError("Team is full")

        existing_member = await self.db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team.id,
                TeamMember.user_id == user.id,
            )
        )
        if existing_member.scalar_one_or_none():
            raise ValueError("Already a member of this team")

        member = TeamMember(
            team_id=team.id,
            user_id=user.id,
            role=TeamMemberRole.MEMBER,
        )
        self.db.add(member)
        await self.db.flush()
        await self.db.refresh(team)

        return team

    async def leave_team(self, team_id: int, user: User) -> None:
        result = await self.db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user.id,
            )
        )
        member = result.scalar_one_or_none()

        if member is None:
            raise ValueError("Not a member of this team")

        if member.role == TeamMemberRole.LEADER:
            remaining = await self.db.execute(
                select(TeamMember).where(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id != user.id,
                )
            )
            remaining_members = list(remaining.scalars().all())
            if remaining_members:
                remaining_members[0].role = TeamMemberRole.LEADER
            else:
                await self.db.delete(member)
                await self.db.flush()
                return

        await self.db.delete(member)
        user.role = UserRole.TEAM_MEMBER
        await self.db.flush()

    async def set_team_ready(self, team_id: int, is_ready: bool) -> Team:
        result = await self.db.execute(select(Team).where(Team.id == team_id))
        team = result.scalar_one_or_none()

        if team is None:
            raise ValueError("Team not found")

        team.is_ready = is_ready
        await self.db.flush()
        await self.db.refresh(team)

        return team

    async def get_team_by_id(self, team_id: int) -> Team | None:
        result = await self.db.execute(select(Team).where(Team.id == team_id))
        return result.scalar_one_or_none()

    async def get_team_by_code(self, team_code: str) -> Team | None:
        result = await self.db.execute(select(Team).where(Team.team_code == team_code))
        return result.scalar_one_or_none()

    async def get_competition_teams(
        self, competition_id: int, skip: int = 0, limit: int = 20
    ) -> tuple[list[Team], int]:
        query = select(Team).where(Team.competition_id == competition_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        teams = list(result.scalars().all())

        return teams, total

    async def get_user_teams(self, user_id: int) -> list[Team]:
        result = await self.db.execute(
            select(Team)
            .join(TeamMember)
            .where(TeamMember.user_id == user_id)
        )
        return list(result.scalars().all())
