@echo off
echo ========================================
echo Starting ER Command Center (No Docker)
echo ========================================
echo.

echo [WARNING] This method requires:
echo   - PostgreSQL installed locally (port 5432)
echo   - Redis installed locally (port 6379) - optional
echo   - Python 3.10+ installed
echo.
pause

echo.
echo [Step 1/3] Checking Python...
python --version
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

echo.
echo [Step 2/3] Setting up Backend...
cd "Code Base Backend"

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Check if .env exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo Please copy .env.example to .env and configure it
    pause
    exit /b 1
)

echo.
echo [WARNING] Make sure PostgreSQL is running and database is created!
echo Database connection from .env will be used.
echo.
pause

echo Starting Backend API...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

cd ..
