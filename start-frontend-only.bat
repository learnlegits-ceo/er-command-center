@echo off
echo ========================================
echo Starting Frontend Development Server
echo ========================================
echo.

echo Checking Node.js...
node --version
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Checking npm...
npm --version
if errorlevel 1 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo.
echo [OK] Node.js and npm are installed!
echo.

cd "Code Base Frontend"

if not exist "node_modules" (
    echo Installing dependencies (this may take a few minutes)...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

echo.
echo Checking .env file...
if not exist ".env" (
    echo Creating default .env file...
    echo VITE_API_BASE_URL=http://localhost:8000/api/v1 > .env
    echo VITE_APP_NAME=ER Command Center >> .env
    echo VITE_ENV=development >> .env
    echo [OK] .env file created
)

echo.
echo ========================================
echo Starting Development Server...
echo ========================================
echo.
echo Frontend will be available at:
echo   http://localhost:5173
echo   or
echo   http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

call npm run dev

cd ..
