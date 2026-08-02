from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="team_member")
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    teams = relationship("TeamMember", back_populates="user")

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    competition_id = Column(Integer, ForeignKey("competitions.id"), default=1)
    leader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invite_code = Column(String(8), unique=True, nullable=False, index=True)
    status = Column(String, default="active")
    is_eliminated = Column(Boolean, default=False)
    presentation_order = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    leader = relationship("User")
    members = relationship("TeamMember", back_populates="team")
    answers = relationship("Answer", back_populates="team")
    debug_submissions = relationship("DebugSubmission", back_populates="team")
    team_clues = relationship("TeamClue", back_populates="team")
    scores = relationship("Score", back_populates="team")
    violations = relationship("Violation", back_populates="team")

class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="teams")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    round_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(Integer, nullable=False)
    difficulty = Column(String, nullable=False)
    points = Column(Integer, default=10)
    time_limit_seconds = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    answers = relationship("Answer", back_populates="question")

class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("team_id", "question_id"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_answer = Column(Integer, nullable=True)
    is_correct = Column(Boolean, nullable=False)
    points_earned = Column(Integer, default=0)
    response_time_seconds = Column(Float, nullable=True)
    answered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="answers")
    question = relationship("Question", back_populates="answers")

class DebugChallenge(Base):
    __tablename__ = "debug_challenges"

    id = Column(Integer, primary_key=True, index=True)
    round_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    buggy_code = Column(Text, nullable=False)
    public_tests = Column(JSON, nullable=False)
    hidden_tests = Column(JSON, nullable=False)
    difficulty = Column(String, nullable=False)
    points = Column(Integer, default=20)
    time_limit_minutes = Column(Integer, default=20)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    submissions = relationship("DebugSubmission", back_populates="challenge")

class DebugSubmission(Base):
    __tablename__ = "debug_submissions"
    __table_args__ = (UniqueConstraint("team_id", "challenge_id", "attempt_number"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("debug_challenges.id"), nullable=False)
    submitted_code = Column(Text, nullable=False)
    passed_public = Column(Integer, default=0)
    passed_hidden = Column(Integer, default=0)
    total_public = Column(Integer, default=0)
    total_hidden = Column(Integer, default=0)
    score = Column(Integer, default=0)
    attempt_number = Column(Integer, default=1)
    status = Column(String, default="pending")
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="debug_submissions")
    challenge = relationship("DebugChallenge", back_populates="submissions")

class Clue(Base):
    __tablename__ = "clues"

    id = Column(Integer, primary_key=True, index=True)
    phase = Column(String, nullable=False)
    round_number = Column(Integer, nullable=False)
    clue_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team_clues = relationship("TeamClue", back_populates="clue")

class TeamClue(Base):
    __tablename__ = "team_clues"
    __table_args__ = (UniqueConstraint("team_id", "clue_id"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    clue_id = Column(Integer, ForeignKey("clues.id"), nullable=False)
    is_unlocked = Column(Boolean, default=False)
    unlocked_at = Column(DateTime, nullable=True)

    team = relationship("Team", back_populates="team_clues")
    clue = relationship("Clue", back_populates="team_clues")

class IdeathonProblem(Base):
    __tablename__ = "ideathon_problems"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, nullable=False)
    problem_statement = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class IdeathonSubmission(Base):
    __tablename__ = "ideathon_submissions"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, nullable=False)
    idea_summary = Column(Text, nullable=False)
    file_path = Column(String, nullable=True)
    ready_at = Column(DateTime, nullable=True)
    presentation_slot = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Score(Base):
    __tablename__ = "scores"
    __table_args__ = (UniqueConstraint("team_id", "phase"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    phase = Column(String, nullable=False)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="scores")

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    violation_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="violations")

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="HackSphere 2026")
    current_phase = Column(String, default="registration")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Round(Base):
    __tablename__ = "rounds"

    id = Column(Integer, primary_key=True, index=True)
    competition_id = Column(Integer, ForeignKey("competitions.id"), default=1)
    phase = Column(String, nullable=False)
    round_number = Column(Integer, nullable=False)
    status = Column(String, default="pending")
    time_limit_minutes = Column(Integer, nullable=True)
    started_at = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    total_paused_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
