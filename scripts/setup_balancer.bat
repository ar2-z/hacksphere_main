@echo off
REM ============================================
REM  HackSphere Load Balancer Setup (Laptop 1)
REM  Run this on the main laptop that handles routing
REM ============================================

echo.
echo ==========================================
echo   HackSphere - Load Balancer Setup
echo ==========================================
echo.

REM Check for Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker not found. Install Docker Desktop from https://docker.com
    echo The load balancer requires Docker to run nginx.
    pause
    exit /b 1
)

REM Get the local IP
echo Detecting local IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo Your LAN IP: %LOCAL_IP%
echo.

REM Update nginx.conf with the backend laptop IPs
echo You need to update nginx.conf with your backend laptop IPs.
echo.
echo Open nginx.conf and replace:
echo   BACKEND_IP_1  = Laptop 2's LAN IP
echo   BACKEND_IP_2  = Laptop 3's LAN IP
echo.

REM Build frontend if not already built
if not exist "frontend\dist\index.html" (
    echo Building frontend...
    cd frontend
    call npm install
    call npm run build
    cd ..
)

echo Starting load balancer with Docker...
docker compose -f docker-compose.balancer.yml up -d

echo.
echo ==========================================
echo   Load balancer started!
echo ==========================================
echo.
echo   Access HackSphere at:  http://%LOCAL_IP%
echo   Local access:          http://localhost
echo.
echo   Users on your LAN can now access via:
echo     http://%LOCAL_IP%
echo.
echo   To stop:  docker compose -f docker-compose.balancer.yml down
echo   To logs:  docker compose -f docker-compose.balancer.yml logs -f
echo.
pause
