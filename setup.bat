@echo off
echo ========================================
echo ER Command Center - Setup Script
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/5] Checking environment files...
if not exist "Code Base Backend\.env" (
    echo [INFO] Backend .env file found!
) else (
    echo [WARNING] Backend .env file not found. Please create it from .env.example
    echo Copy "Code Base Backend\.env.example" to "Code Base Backend\.env"
    pause
)

if not exist "Code Base Frontend\.env" (
    echo [INFO] Frontend .env file found!
) else (
    echo [WARNING] Frontend .env not found. Creating default...
    echo VITE_API_BASE_URL=http://localhost:8000/api/v1 > "Code Base Frontend\.env"
    echo VITE_APP_NAME=ER Command Center >> "Code Base Frontend\.env"
    echo VITE_ENV=development >> "Code Base Frontend\.env"
)

echo.
echo [2/5] Setting up Backend (Docker)...
cd "Code Base Backend"
echo Starting PostgreSQL, Redis, and Backend API...
docker-compose up -d postgres redis

echo Waiting for database to initialize (20 seconds)...
timeout /t 20 /nobreak >nul

docker-compose up -d backend

echo Backend services started!
cd ..

echo.
echo [3/5] Installing Frontend Dependencies...
cd "Code Base Frontend"
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
) else (
    echo Dependencies already installed!
)
cd ..

echo.
echo [4/5] Starting Frontend Development Server...
cd "Code Base Frontend"
start "ER Command Center - Frontend" cmd /k "npm run dev"
cd ..

echo.
echo [5/5] Setup Complete!
echo.
echo ========================================
echo Services Running:
echo ========================================
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/api/docs
echo Frontend: http://localhost:5173 or http://localhost:3000
echo Database: localhost:5432 (user: postgres, db: demo_health)
echo.
echo Demo Credentials:
echo   Nurse:  priya@hospital.com / nurse123
echo   Doctor: ananya@hospital.com / doctor123
echo   Admin:  rajesh@hospital.com / admin123
echo.
echo To stop services:
echo   cd "Code Base Backend" ^&^& docker-compose down
echo ========================================
echo.
pause
