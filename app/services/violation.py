from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.team import TeamMember
from app.domain.entities.user import User
from app.domain.entities.violation import (
    Violation,
    ViolationAction,
    ViolationSeverity,
    ViolationType,
)


class ViolationService:
    VIOLATION_THRESHOLDS = {
        ViolationAction.WARN: 3,
        ViolationAction.FREEZE: 5,
        ViolationAction.LOCK: 8,
        ViolationAction.KICK: 10,
        ViolationAction.DISQUALIFY: 15,
    }

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def report_violation(
        self,
        user_id: int,
        competition_id: int,
        violation_type: ViolationType,
        description: str | None = None,
        metadata: dict | None = None,
    ) -> Violation:
        team_id = await self._get_user_team_id(user_id)

        severity = self._determine_severity(violation_type)

        violation = Violation(
            user_id=user_id,
            team_id=team_id,
            competition_id=competition_id,
            violation_type=violation_type,
            severity=severity,
            action_taken=ViolationAction.NONE,
            description=description,
            extra_data=metadata,
        )
        self.db.add(violation)
        await self.db.flush()

        action = await self._determine_action(user_id, competition_id)
        if action != ViolationAction.NONE:
            violation.action_taken = action
            await self.db.flush()

        await self.db.refresh(violation)
        return violation

    async def report_tab_switch(
        self, user_id: int, competition_id: int
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.TAB_SWITCH,
            description="Tab switch detected",
        )

    async def report_window_blur(
        self, user_id: int, competition_id: int
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.WINDOW_BLUR,
            description="Window focus lost",
        )

    async def report_fullscreen_exit(
        self, user_id: int, competition_id: int
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.FULLSCREEN_EXIT,
            description="Fullscreen mode exited",
            metadata={"severity_boost": True},
        )

    async def report_clipboard_copy(
        self, user_id: int, competition_id: int
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.CLIPBOARD_COPY,
            description="Clipboard copy detected",
        )

    async def report_clipboard_paste(
        self, user_id: int, competition_id: int
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.CLIPBOARD_PASTE,
            description="Clipboard paste detected",
            metadata={"severity_boost": True},
        )

    async def report_right_click(
        self, user_id: int, competition_id: int
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.RIGHT_CLICK,
            description="Right click detected",
        )

    async def report_keyboard_shortcut(
        self, user_id: int, competition_id: int, shortcut: str = ""
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.KEYBOARD_SHORTCUT,
            description=f"Keyboard shortcut detected: {shortcut}",
            metadata={"shortcut": shortcut},
        )

    async def report_browser_refresh(
        self, user_id: int, competition_id: int
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.BROWSER_REFRESH,
            description="Browser refresh detected",
            metadata={"severity_boost": True},
        )

    async def report_suspicious_activity(
        self, user_id: int, competition_id: int, description: str
    ) -> Violation:
        return await self.report_violation(
            user_id=user_id,
            competition_id=competition_id,
            violation_type=ViolationType.SUSPICIOUS_ACTIVITY,
            description=description,
            metadata={"severity_boost": True},
        )

    def _determine_severity(self, violation_type: ViolationType) -> ViolationSeverity:
        high_severity = {
            ViolationType.FULLSCREEN_EXIT,
            ViolationType.CLIPBOARD_PASTE,
            ViolationType.BROWSER_REFRESH,
            ViolationType.SUSPICIOUS_ACTIVITY,
        }

        medium_severity = {
            ViolationType.TAB_SWITCH,
            ViolationType.WINDOW_BLUR,
            ViolationType.KEYBOARD_SHORTCUT,
        }

        if violation_type in high_severity:
            return ViolationSeverity.HIGH
        elif violation_type in medium_severity:
            return ViolationSeverity.MEDIUM
        else:
            return ViolationSeverity.LOW

    async def _determine_action(
        self, user_id: int, competition_id: int
    ) -> ViolationAction:
        violation_count = await self._get_violation_count(user_id, competition_id)

        if violation_count >= self.VIOLATION_THRESHOLDS[ViolationAction.DISQUALIFY]:
            return ViolationAction.DISQUALIFY
        elif violation_count >= self.VIOLATION_THRESHOLDS[ViolationAction.KICK]:
            return ViolationAction.KICK
        elif violation_count >= self.VIOLATION_THRESHOLDS[ViolationAction.LOCK]:
            return ViolationAction.LOCK
        elif violation_count >= self.VIOLATION_THRESHOLDS[ViolationAction.FREEZE]:
            return ViolationAction.FREEZE
        elif violation_count >= self.VIOLATION_THRESHOLDS[ViolationAction.WARN]:
            return ViolationAction.WARN

        return ViolationAction.NONE

    async def _get_violation_count(
        self, user_id: int, competition_id: int
    ) -> int:
        result = await self.db.execute(
            select(func.count(Violation.id)).where(
                Violation.user_id == user_id,
                Violation.competition_id == competition_id,
            )
        )
        return result.scalar() or 0

    async def get_user_violations(
        self, user_id: int, competition_id: int
    ) -> list[Violation]:
        result = await self.db.execute(
            select(Violation)
            .where(
                Violation.user_id == user_id,
                Violation.competition_id == competition_id,
            )
            .order_by(Violation.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_team_violations(
        self, team_id: int, competition_id: int
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Violation)
            .join(User)
            .where(
                Violation.team_id == team_id,
                Violation.competition_id == competition_id,
            )
            .order_by(Violation.created_at.desc())
        )
        violations = list(result.scalars().all())

        team_violations = []
        for v in violations:
            user_result = await self.db.execute(
                select(User).where(User.id == v.user_id)
            )
            user = user_result.scalar_one_or_none()

            team_violations.append({
                "id": v.id,
                "user_id": v.user_id,
                "user_name": user.full_name if user else "Unknown",
                "violation_type": v.violation_type.value,
                "severity": v.severity.value,
                "action_taken": v.action_taken.value,
                "description": v.description,
                "created_at": v.created_at.isoformat(),
            })

        return team_violations

    async def get_competition_violations(
        self, competition_id: int
    ) -> dict[str, Any]:
        result = await self.db.execute(
            select(Violation)
            .where(Violation.competition_id == competition_id)
            .order_by(Violation.created_at.desc())
        )
        violations = list(result.scalars().all())

        type_counts = {}
        severity_counts = {}
        action_counts = {}

        for v in violations:
            vtype = v.violation_type.value
            type_counts[vtype] = type_counts.get(vtype, 0) + 1

            severity = v.severity.value
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

            action = v.action_taken.value
            action_counts[action] = action_counts.get(action, 0) + 1

        return {
            "competition_id": competition_id,
            "total_violations": len(violations),
            "by_type": type_counts,
            "by_severity": severity_counts,
            "by_action": action_counts,
        }

    async def get_violation_stats(
        self, competition_id: int
    ) -> dict[str, Any]:
        result = await self.db.execute(
            select(
                Violation.user_id,
                func.count(Violation.id).label("violation_count"),
            )
            .where(Violation.competition_id == competition_id)
            .group_by(Violation.user_id)
            .order_by(func.count(Violation.id).desc())
        )
        user_violations = list(result.all())

        top_violators = []
        for uv in user_violations[:10]:
            user_result = await self.db.execute(
                select(User).where(User.id == uv.user_id)
            )
            user = user_result.scalar_one_or_none()

            top_violators.append({
                "user_id": uv.user_id,
                "user_name": user.full_name if user else "Unknown",
                "violation_count": uv.violation_count,
            })

        return {
            "competition_id": competition_id,
            "total_users_with_violations": len(user_violations),
            "top_violators": top_violators,
        }

    async def take_action(
        self,
        violation_id: int,
        action: ViolationAction,
        admin_id: int,
        reason: str | None = None,
    ) -> Violation:
        result = await self.db.execute(
            select(Violation).where(Violation.id == violation_id)
        )
        violation = result.scalar_one_or_none()

        if not violation:
            raise ValueError("Violation not found")

        violation.action_taken = action
        violation.resolved_by = admin_id
        violation.resolved_at = datetime.now(timezone.utc)
        violation.is_resolved = True

        if reason:
            violation.description = f"{violation.description} | Action reason: {reason}"

        await self.db.flush()
        await self.db.refresh(violation)
        return violation

    async def resolve_violation(
        self, violation_id: int, admin_id: int
    ) -> Violation:
        result = await self.db.execute(
            select(Violation).where(Violation.id == violation_id)
        )
        violation = result.scalar_one_or_none()

        if not violation:
            raise ValueError("Violation not found")

        violation.is_resolved = True
        violation.resolved_by = admin_id
        violation.resolved_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(violation)
        return violation

    async def get_user_violation_count(
        self, user_id: int, competition_id: int
    ) -> dict[str, Any]:
        count = await self._get_violation_count(user_id, competition_id)

        result = await self.db.execute(
            select(Violation)
            .where(
                Violation.user_id == user_id,
                Violation.competition_id == competition_id,
            )
            .order_by(Violation.created_at.desc())
            .limit(1)
        )
        last_violation = result.scalar_one_or_none()

        return {
            "user_id": user_id,
            "competition_id": competition_id,
            "total_violations": count,
            "last_violation_at": last_violation.created_at.isoformat() if last_violation else None,
            "current_action": last_violation.action_taken.value if last_violation else "none",
        }

    async def _get_user_team_id(self, user_id: int) -> int | None:
        result = await self.db.execute(
            select(TeamMember.team_id).where(TeamMember.user_id == user_id)
        )
        row = result.first()
        return row[0] if row else None
