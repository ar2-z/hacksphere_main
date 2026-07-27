@echo off
REM ============================================
REM  HackSphere Backend Server Setup (Laptop 2, 3)
REM  Run this once on each backend laptop
REM ============================================

echo.
echo ==========================================
echo   HackSphere - Backend Laptop Setup
echo ==========================================
echo.

REM Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Install Python 3.12+ from https://python.org
    pause
    exit /b 1
)

REM Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

REM Check for Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Docker not found. Install Docker Desktop from https://docker.com
    echo You can still run without Docker using start_server.py
    echo.
)

echo [1/4] Installing Python dependencies...
pip install --no-cache-dir .
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo [2/4] Installing frontend dependencies and building...
cd frontend
call npm install
call npm run build
cd ..

echo [3/4] Creating .env.production from template...
if not exist .env.production (
    copy .env.example .env.production 2>nul
    if not exist .env.production (
        echo DATABASE_URL=postgresql+asyncpg://user:password@host:5432/hacksphere > .env.production
        echo APP_ENV=production >> .env.production
        echo DEBUG=false >> .env.production
        echo SECRET_KEY=CHANGE-THIS-TO-A-RANDOM-SECRET >> .env.production
        echo JWT_SECRET_KEY=CHANGE-THIS-TO-A-RANDOM-SECRET >> .env.production
        echo CORS_ORIGINS=["*"] >> .env.production
        echo.
        echo IMPORTANT: Edit .env.production with your actual database credentials!
        echo.
    )
)

echo [4/4] Setup complete!
echo.
echo ==========================================
echo   How to start the backend server:
echo ==========================================
echo.
echo   Option A (Direct):
echo     python scripts/start_server.py --port 8000 --workers 4
echo.
echo   Option B (Docker):
echo     docker compose -f docker-compose.backend.yml up -d
echo.
echo   Replace the IPs in nginx.conf on the load balancer laptop
echo   with this laptop's LAN IP: (run ipconfig to find it)
echo.
pause
