"""Initial database schema

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    user_role_enum = postgresql.ENUM(
        "super_admin", "admin", "team_leader", "team_member",
        name="userrole", create_type=False
    )
    user_role_enum.create(op.get_bind(), checkfirst=True)

    competition_status_enum = postgresql.ENUM(
        "draft", "registration_open", "registration_closed",
        "in_progress", "completed", "archived",
        name="competitionstatus", create_type=False
    )
    competition_status_enum.create(op.get_bind(), checkfirst=True)

    competition_phase_type_enum = postgresql.ENUM(
        "quiz", "debugging", "ideathon",
        name="competitionphasetype", create_type=False
    )
    competition_phase_type_enum.create(op.get_bind(), checkfirst=True)

    competition_phase_status_enum = postgresql.ENUM(
        "pending", "active", "paused", "completed",
        name="competitionphasestatus", create_type=False
    )
    competition_phase_status_enum.create(op.get_bind(), checkfirst=True)

    team_member_role_enum = postgresql.ENUM(
        "leader", "member",
        name="teammemberrole", create_type=False
    )
    team_member_role_enum.create(op.get_bind(), checkfirst=True)

    quiz_difficulty_enum = postgresql.ENUM(
        "easy", "medium", "hard",
        name="quizdifficulty", create_type=False
    )
    quiz_difficulty_enum.create(op.get_bind(), checkfirst=True)

    quiz_round_status_enum = postgresql.ENUM(
        "pending", "active", "paused", "completed",
        name="quizroundstatus", create_type=False
    )
    quiz_round_status_enum.create(op.get_bind(), checkfirst=True)

    debug_difficulty_enum = postgresql.ENUM(
        "easy", "medium", "hard",
        name="debugdifficulty", create_type=False
    )
    debug_difficulty_enum.create(op.get_bind(), checkfirst=True)

    debug_round_status_enum = postgresql.ENUM(
        "pending", "active", "paused", "completed",
        name="debugroundstatus", create_type=False
    )
    debug_round_status_enum.create(op.get_bind(), checkfirst=True)

    debug_submission_status_enum = postgresql.ENUM(
        "pending", "running", "accepted", "wrong_answer",
        "time_limit_exceeded", "memory_limit_exceeded",
        "runtime_error", "compilation_error",
        name="debugsubmissionstatus", create_type=False
    )
    debug_submission_status_enum.create(op.get_bind(), checkfirst=True)

    presentation_status_enum = postgresql.ENUM(
        "draft", "submitted", "ready", "in_progress", "completed",
        name="presentationstatus", create_type=False
    )
    presentation_status_enum.create(op.get_bind(), checkfirst=True)

    clue_type_enum = postgresql.ENUM(
        "text", "image", "code_snippet", "hint", "riddle",
        name="cluetype", create_type=False
    )
    clue_type_enum.create(op.get_bind(), checkfirst=True)

    clue_source_phase_enum = postgresql.ENUM(
        "quiz", "debugging", "ideathon", "manual",
        name="cluesourcephase", create_type=False
    )
    clue_source_phase_enum.create(op.get_bind(), checkfirst=True)

    score_phase_enum = postgresql.ENUM(
        "quiz", "debugging", "ideathon", "bonus", "penalty", "manual",
        name="scorephase", create_type=False
    )
    score_phase_enum.create(op.get_bind(), checkfirst=True)

    violation_type_enum = postgresql.ENUM(
        "tab_switch", "window_blur", "fullscreen_exit",
        "clipboard_copy", "clipboard_paste", "right_click",
        "keyboard_shortcut", "browser_refresh", "suspicious_activity",
        name="violationtype", create_type=False
    )
    violation_type_enum.create(op.get_bind(), checkfirst=True)

    violation_severity_enum = postgresql.ENUM(
        "low", "medium", "high", "critical",
        name="violationseverity", create_type=False
    )
    violation_severity_enum.create(op.get_bind(), checkfirst=True)

    violation_action_enum = postgresql.ENUM(
        "none", "warn", "freeze", "lock", "kick", "disqualify",
        name="violationaction", create_type=False
    )
    violation_action_enum.create(op.get_bind(), checkfirst=True)

    announcement_priority_enum = postgresql.ENUM(
        "low", "normal", "high", "urgent",
        name="announcementpriority", create_type=False
    )
    announcement_priority_enum.create(op.get_bind(), checkfirst=True)

    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.Text(), nullable=False),
        sa.Column("role", sa.Enum("super_admin", "admin", "team_leader", "team_member", name="userrole"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("college", sa.String(255), nullable=True),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("year_of_study", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])

    # Competitions table
    op.create_table(
        "competitions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("theme", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum("draft", "registration_open", "registration_closed", "in_progress", "completed", "archived", name="competitionstatus"), nullable=False),
        sa.Column("max_teams", sa.Integer(), nullable=False),
        sa.Column("team_min_size", sa.Integer(), nullable=False),
        sa.Column("team_max_size", sa.Integer(), nullable=False),
        sa.Column("registration_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("registration_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("event_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("event_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_competitions_name"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
    )
    op.create_index("ix_competitions_name", "competitions", ["name"])

    # Competition phases table
    op.create_table(
        "competition_phases",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("phase_type", sa.Enum("quiz", "debugging", "ideathon", name="competitionphasetype"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("pending", "active", "paused", "completed", name="competitionphasestatus"), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
    )

    # Teams table
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("team_code", sa.String(8), nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("max_members", sa.Integer(), nullable=False),
        sa.Column("is_ready", sa.Boolean(), nullable=False),
        sa.Column("presentation_order", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_code", name="uq_teams_team_code"),
        sa.UniqueConstraint("name", "competition_id", name="uq_team_name_competition"),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
    )
    op.create_index("ix_teams_name", "teams", ["name"])
    op.create_index("ix_teams_team_code", "teams", ["team_code"])

    # Team members table
    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.Enum("leader", "member", name="teammemberrole"), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_member"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )

    # Clues table
    op.create_table(
        "clues",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("clue_type", sa.Enum("text", "image", "code_snippet", "hint", "riddle", name="cluetype"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("source_phase", sa.Enum("quiz", "debugging", "ideathon", "manual", name="cluesourcephase"), nullable=False),
        sa.Column("source_round", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
    )

    # Quiz rounds table
    op.create_table(
        "quiz_rounds",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.Enum("easy", "medium", "hard", name="quizdifficulty"), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("pending", "active", "paused", "completed", name="quizroundstatus"), nullable=False),
        sa.Column("points_per_question", sa.Integer(), nullable=False),
        sa.Column("time_bonus_points", sa.Integer(), nullable=False),
        sa.Column("clue_id", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("competition_id", "round_number", name="uq_quiz_round_number"),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["clue_id"], ["clues.id"]),
    )

    # Quiz questions table
    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("round_id", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(50), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=False),
        sa.Column("correct_answer", sa.String(255), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["round_id"], ["quiz_rounds.id"], ondelete="CASCADE"),
    )

    # Quiz answers table
    op.create_table(
        "quiz_answers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("selected_answer", sa.String(255), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("points_earned", sa.Integer(), nullable=False),
        sa.Column("time_taken_seconds", sa.Float(), nullable=False),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_id", "team_id", name="uq_quiz_answer_per_team"),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
    )

    # Debug challenges table
    op.create_table(
        "debug_challenges",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.Enum("easy", "medium", "hard", name="debugdifficulty"), nullable=False),
        sa.Column("buggy_code", sa.Text(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("memory_limit_mb", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("clue_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.Enum("pending", "active", "paused", "completed", name="debugroundstatus"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("competition_id", "round_number", name="uq_debug_round_number"),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["clue_id"], ["clues.id"]),
    )

    # Debug test cases table
    op.create_table(
        "debug_test_cases",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("challenge_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("input_data", sa.Text(), nullable=False),
        sa.Column("expected_output", sa.Text(), nullable=False),
        sa.Column("is_hidden", sa.Boolean(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["challenge_id"], ["debug_challenges.id"], ondelete="CASCADE"),
    )

    # Debug submissions table
    op.create_table(
        "debug_submissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("challenge_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("submitted_code", sa.Text(), nullable=False),
        sa.Column("status", sa.Enum("pending", "running", "accepted", "wrong_answer", "time_limit_exceeded", "memory_limit_exceeded", "runtime_error", "compilation_error", name="debugsubmissionstatus"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("execution_time_ms", sa.Float(), nullable=True),
        sa.Column("memory_used_mb", sa.Float(), nullable=True),
        sa.Column("test_results", postgresql.JSONB(), nullable=True),
        sa.Column("quality_score", sa.Float(), nullable=False),
        sa.Column("readability_score", sa.Float(), nullable=False),
        sa.Column("efficiency_score", sa.Float(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("challenge_id", "team_id", name="uq_debug_submission_per_team"),
        sa.ForeignKeyConstraint(["challenge_id"], ["debug_challenges.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
    )

    # Presentations table
    op.create_table(
        "presentations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("problem_statement", sa.Text(), nullable=False),
        sa.Column("idea_summary", sa.Text(), nullable=False),
        sa.Column("presentation_file_url", sa.String(500), nullable=True),
        sa.Column("presentation_file_name", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum("draft", "submitted", "ready", "in_progress", "completed", name="presentationstatus"), nullable=False),
        sa.Column("presentation_order", sa.Integer(), nullable=True),
        sa.Column("theme", sa.String(255), nullable=True),
        sa.Column("problem_category", sa.String(255), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ready_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("presented_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
    )

    # Presentation scores table
    op.create_table(
        "presentation_scores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("presentation_id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("criteria", postgresql.JSONB(), nullable=True),
        sa.Column("scored_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["presentation_id"], ["presentations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"]),
    )

    # Clue distributions table
    op.create_table(
        "clue_distributions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("clue_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("is_revealed", sa.Boolean(), nullable=False),
        sa.Column("revealed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("earned_by_round", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("clue_id", "team_id", name="uq_clue_distribution"),
        sa.ForeignKeyConstraint(["clue_id"], ["clues.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
    )

    # Scores table
    op.create_table(
        "scores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("phase", sa.Enum("quiz", "debugging", "ideathon", "bonus", "penalty", "manual", name="scorephase"), nullable=False),
        sa.Column("points", sa.Float(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("awarded_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id", "phase", "reference_id", "reference_type", name="uq_score_per_reference"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["awarded_by"], ["users.id"]),
    )

    # Score history table
    op.create_table(
        "score_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("total_score", sa.Float(), nullable=False),
        sa.Column("quiz_score", sa.Float(), nullable=False),
        sa.Column("debugging_score", sa.Float(), nullable=False),
        sa.Column("ideathon_score", sa.Float(), nullable=False),
        sa.Column("bonus_score", sa.Float(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
    )

    # Violations table
    op.create_table(
        "violations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=True),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("violation_type", sa.Enum("tab_switch", "window_blur", "fullscreen_exit", "clipboard_copy", "clipboard_paste", "right_click", "keyboard_shortcut", "browser_refresh", "suspicious_activity", name="violationtype"), nullable=False),
        sa.Column("severity", sa.Enum("low", "medium", "high", "critical", name="violationseverity"), nullable=False),
        sa.Column("action_taken", sa.Enum("none", "warn", "freeze", "lock", "kick", "disqualify", name="violationaction"), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("is_resolved", sa.Boolean(), nullable=False),
        sa.Column("resolved_by", sa.Integer(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"]),
    )

    # Announcements table
    op.create_table(
        "announcements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("priority", sa.Enum("low", "normal", "high", "urgent", name="announcementpriority"), nullable=False),
        sa.Column("is_pinned", sa.Boolean(), nullable=False),
        sa.Column("is_broadcast", sa.Boolean(), nullable=False),
        sa.Column("target_team_id", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
    )

    # Audit logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("announcements")
    op.drop_table("violations")
    op.drop_table("score_history")
    op.drop_table("scores")
    op.drop_table("clue_distributions")
    op.drop_table("presentation_scores")
    op.drop_table("presentations")
    op.drop_table("debug_submissions")
    op.drop_table("debug_test_cases")
    op.drop_table("debug_challenges")
    op.drop_table("quiz_answers")
    op.drop_table("quiz_questions")
    op.drop_table("quiz_rounds")
    op.drop_table("clues")
    op.drop_table("team_members")
    op.drop_table("teams")
    op.drop_table("competition_phases")
    op.drop_table("competitions")
    op.drop_table("users")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS announcementpriority")
    op.execute("DROP TYPE IF EXISTS violationaction")
    op.execute("DROP TYPE IF EXISTS violationseverity")
    op.execute("DROP TYPE IF EXISTS violationtype")
    op.execute("DROP TYPE IF EXISTS scorephase")
    op.execute("DROP TYPE IF EXISTS cluesourcephase")
    op.execute("DROP TYPE IF EXISTS cluetype")
    op.execute("DROP TYPE IF EXISTS presentationstatus")
    op.execute("DROP TYPE IF EXISTS debugsubmissionstatus")
    op.execute("DROP TYPE IF EXISTS debugroundstatus")
    op.execute("DROP TYPE IF EXISTS debugdifficulty")
    op.execute("DROP TYPE IF EXISTS quizroundstatus")
    op.execute("DROP TYPE IF EXISTS quizdifficulty")
    op.execute("DROP TYPE IF EXISTS teammemberrole")
    op.execute("DROP TYPE IF EXISTS competitionphasestatus")
    op.execute("DROP TYPE IF EXISTS competitionphasetype")
    op.execute("DROP TYPE IF EXISTS competitionstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
