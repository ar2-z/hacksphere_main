from app.domain.entities.user import User, UserRole
from app.domain.entities.team import Team, TeamMember
from app.domain.entities.competition import Competition, CompetitionPhase
from app.domain.entities.quiz import QuizRound, QuizQuestion, QuizAnswer
from app.domain.entities.debugging import DebugChallenge, DebugTestCase, DebugSubmission
from app.domain.entities.ideathon import Presentation, PresentationScore
from app.domain.entities.clue import Clue, ClueDistribution
from app.domain.entities.score import Score, ScoreHistory
from app.domain.entities.violation import Violation
from app.domain.entities.announcement import Announcement
from app.domain.entities.audit import AuditLog

__all__ = [
    "User", "UserRole",
    "Team", "TeamMember",
    "Competition", "CompetitionPhase",
    "QuizRound", "QuizQuestion", "QuizAnswer",
    "DebugChallenge", "DebugTestCase", "DebugSubmission",
    "Presentation", "PresentationScore",
    "Clue", "ClueDistribution",
    "Score", "ScoreHistory",
    "Violation",
    "Announcement",
    "AuditLog",
]
