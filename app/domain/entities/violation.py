from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.user import User


class ViolationType(str, enum.Enum):
    TAB_SWITCH = "tab_switch"
    WINDOW_BLUR = "window_blur"
    FULLSCREEN_EXIT = "fullscreen_exit"
    CLIPBOARD_COPY = "clipboard_copy"
    CLIPBOARD_PASTE = "clipboard_paste"
    RIGHT_CLICK = "right_click"
    KEYBOARD_SHORTCUT = "keyboard_shortcut"
    BROWSER_REFRESH = "browser_refresh"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


class ViolationSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ViolationAction(str, enum.Enum):
    NONE = "none"
    WARN = "warn"
    FREEZE = "freeze"
    LOCK = "lock"
    KICK = "kick"
    DISQUALIFY = "disqualify"


class Violation(Base):
    __tablename__ = "violations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    team_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("teams.id"), nullable=True
    )
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id"), nullable=False
    )
    violation_type: Mapped[ViolationType] = mapped_column(
        Enum(ViolationType), nullable=False
    )
    severity: Mapped[ViolationSeverity] = mapped_column(
        Enum(ViolationSeverity), default=ViolationSeverity.LOW, nullable=False
    )
    action_taken: Mapped[ViolationAction] = mapped_column(
        Enum(ViolationAction), default=ViolationAction.NONE, nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(default=False, nullable=False)
    resolved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped[User] = relationship("User", back_populates="violations", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<Violation(id={self.id}, type={self.violation_type}, severity={self.severity})>"
