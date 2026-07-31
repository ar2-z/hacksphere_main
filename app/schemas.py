from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str = Field(min_length=8)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Any

class TeamCreate(BaseModel):
    name: str

class TeamJoin(BaseModel):
    invite_code: str

class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: int
    response_time_seconds: float

class DebugSubmit(BaseModel):
    challenge_id: int
    submitted_code: str

class IdeathonSubmit(BaseModel):
    idea_summary: str

class AnnouncementCreate(BaseModel):
    message: str
