import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db, init_db
from .schemas import LoginRequest, RegisterRequest, TokenResponse, ChangePasswordRequest
from .auth import (
    create_access_token,
    get_current_user,
    authenticate_user,
    on_register,
    login_limiter,
    verify_password,
    get_password_hash,
)
from .models import User
from .quiz import router as quiz_router
from .debug import router as debug_router, reset_stuck_submissions
from .ideathon import router as ideathon_router
from .admin import router as admin_router
from .leaderboard import router as leaderboard_router
from .heartbeat import router as heartbeat_router
from .teams import router as teams_router, ensure_user_team

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    reset_stuck_submissions()
    yield

app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))

app.include_router(quiz_router)
app.include_router(debug_router)
app.include_router(ideathon_router)
app.include_router(admin_router)
app.include_router(leaderboard_router)
app.include_router(heartbeat_router)
app.include_router(teams_router)

@app.post("/api/auth/register")
def register_user(data: RegisterRequest, db: Session = Depends(get_db)):
    user = on_register(db, data)
    token = create_access_token({"user_id": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    )

@app.post("/api/auth/login")
def login_user(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    limiter_key = f"{client_ip}:{data.username}"
    if not login_limiter.check(limiter_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )
    user = authenticate_user(db, data.username, data.password)
    if not user:
        login_limiter.record(limiter_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    login_limiter.reset(limiter_key)
    if user.role != "admin":
        ensure_user_team(db, user, team_name=data.team_name)
    token = create_access_token({"user_id": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    )

@app.post("/api/auth/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.get("/api/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }

@app.get("/api/auth/check")
def auth_check(current_user: User = Depends(get_current_user)):
    return {"authenticated": True, "role": current_user.role}

@app.get("/")
def root():
    return RedirectResponse(url="/login")

@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/dashboard")
def dashboard_page(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/quiz")
def quiz_page(request: Request):
    return templates.TemplateResponse("quiz.html", {"request": request})

@app.get("/debug")
def debug_page(request: Request):
    return templates.TemplateResponse("debug.html", {"request": request})

@app.get("/ideathon")
def ideathon_page(request: Request):
    return templates.TemplateResponse("ideathon.html", {"request": request})

@app.get("/leaderboard")
def leaderboard_page(request: Request):
    return templates.TemplateResponse("leaderboard.html", {"request": request})

@app.get("/admin")
@app.get("/admin/dashboard")
def admin_page(request: Request):
    return templates.TemplateResponse("admin/dashboard.html", {"request": request})

@app.get("/admin/teams")
def admin_teams_page(request: Request):
    return templates.TemplateResponse("admin/teams.html", {"request": request})

@app.get("/admin/quiz")
def admin_quiz_page(request: Request):
    return templates.TemplateResponse("admin/quiz.html", {"request": request})

@app.get("/admin/debug")
def admin_debug_page(request: Request):
    return templates.TemplateResponse("admin/debug.html", {"request": request})

@app.get("/admin/ideathon")
def admin_ideathon_page(request: Request):
    return templates.TemplateResponse("admin/ideathon.html", {"request": request})

@app.get("/admin/members")
def admin_members_page(request: Request):
    return templates.TemplateResponse("admin/members.html", {"request": request})

@app.get("/admin/violations")
def admin_violations_page(request: Request):
    return templates.TemplateResponse("admin/violations.html", {"request": request})

@app.get("/admin/announcements")
def admin_announcements_page(request: Request):
    return templates.TemplateResponse("admin/announcements.html", {"request": request})
