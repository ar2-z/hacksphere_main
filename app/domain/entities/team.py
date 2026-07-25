from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.user import User
    from app.domain.entities.competition import Competition
    from app.domain.entities.score import Score


class TeamMemberRole(str, enum.Enum):
    LEADER = "leader"
    MEMBER = "member"


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    team_code: Mapped[str] = mapped_column(
        String(8), unique=True, nullable=False, index=True
    )
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id"), nullable=False
    )
    max_members: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    is_ready: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    presentation_order: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    members: Mapped[list[TeamMember]] = relationship(
        "TeamMember", back_populates="team", lazy="selectin", cascade="all, delete-orphan"
    )
    competition: Mapped[Competition] = relationship(
        "Competition", back_populates="teams", lazy="selectin"
    )
    scores: Mapped[list[Score]] = relationship(
        "Score", back_populates="team", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint("name", "competition_id", name="uq_team_name_competition"),
    )

    def __repr__(self) -> str:
        return f"<Team(id={self.id}, name={self.name})>"

    @property
    def member_count(self) -> int:
        return len(self.members)


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[TeamMemberRole] = mapped_column(
        Enum(TeamMemberRole), default=TeamMemberRole.MEMBER, nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    team: Mapped[Team] = relationship("Team", back_populates="members")
    user: Mapped[User] = relationship("User", back_populates="team_memberships")

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )

    def __repr__(self) -> str:
        return f"<TeamMember(team_id={self.team_id}, user_id={self.user_id})>"
