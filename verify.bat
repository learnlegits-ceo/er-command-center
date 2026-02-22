@echo off
echo ========================================
echo ER Command Center - Service Verification
echo ========================================
echo.

set "BACKEND_URL=http://localhost:8000"
set "FRONTEND_URL=http://localhost:5173"
set "DB_HOST=localhost"
set "DB_PORT=5432"
set "REDIS_PORT=6379"

echo [1/6] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Docker is not running
    set "DOCKER_OK=NO"
) else (
    echo [OK] Docker is running
    set "DOCKER_OK=YES"
)

echo.
echo [2/6] Checking PostgreSQL Database...
docker ps | findstr er_postgres >nul 2>&1
if errorlevel 1 (
    echo [FAIL] PostgreSQL container is not running
    echo   Fix: cd "Code Base Backend" ^&^& docker-compose up -d postgres
    set "DB_OK=NO"
) else (
    echo [OK] PostgreSQL container is running
    set "DB_OK=YES"
)

echo.
echo [3/6] Checking Redis Cache...
docker ps | findstr er_redis >nul 2>&1
if errorlevel 1 (
    echo [WARN] Redis container is not running (optional)
    echo   Fix: cd "Code Base Backend" ^&^& docker-compose up -d redis
    set "REDIS_OK=NO"
) else (
    echo [OK] Redis container is running
    set "REDIS_OK=YES"
)

echo.
echo [4/6] Checking Backend API...
curl -s %BACKEND_URL%/health >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Backend API is not responding
    echo   Fix: cd "Code Base Backend" ^&^& docker-compose up -d backend
    echo   Then check logs: docker-compose logs backend
    set "BACKEND_OK=NO"
) else (
    echo [OK] Backend API is responding
    for /f "delims=" %%i in ('curl -s %BACKEND_URL%/health') do set "HEALTH_RESPONSE=%%i"
    echo   Response: %HEALTH_RESPONSE%
    set "BACKEND_OK=YES"
)

echo.
echo [5/6] Checking Backend API Documentation...
curl -s -o nul -w "%%{http_code}" %BACKEND_URL%/api/docs >nul 2>&1
if errorlevel 1 (
    echo [WARN] API docs not accessible (check if DEBUG=true in .env)
) else (
    echo [OK] API docs available at %BACKEND_URL%/api/docs
)

echo.
echo [6/6] Checking Frontend...
curl -s -o nul %FRONTEND_URL% >nul 2>&1
if errorlevel 1 (
    echo [WARN] Frontend is not running
    echo   Fix: cd "Code Base Frontend" ^&^& npm run dev
    set "FRONTEND_OK=NO"
) else (
    echo [OK] Frontend is running at %FRONTEND_URL%
    set "FRONTEND_OK=YES"
)

echo.
echo ========================================
echo Service Status Summary
echo ========================================
echo Docker:      %DOCKER_OK%
echo PostgreSQL:  %DB_OK%
echo Redis:       %REDIS_OK%
echo Backend API: %BACKEND_OK%
echo Frontend:    %FRONTEND_OK%
echo ========================================

echo.
if "%DOCKER_OK%"=="YES" if "%DB_OK%"=="YES" if "%BACKEND_OK%"=="YES" if "%FRONTEND_OK%"=="YES" (
    echo [SUCCESS] All services are running!
    echo.
    echo Quick Links:
    echo   Frontend:  %FRONTEND_URL%
    echo   Backend:   %BACKEND_URL%
    echo   API Docs:  %BACKEND_URL%/api/docs
    echo.
    echo Demo Credentials:
    echo   Nurse:  priya@hospital.com / nurse123
    echo   Doctor: ananya@hospital.com / doctor123
    echo   Admin:  rajesh@hospital.com / admin123
) else (
    echo [WARNING] Some services are not running.
    echo Please check the failures above and fix them.
    echo.
    echo Common fixes:
    echo   1. Start Docker Desktop
    echo   2. cd "Code Base Backend" ^&^& docker-compose up -d
    echo   3. cd "Code Base Frontend" ^&^& npm run dev
)

echo.
echo ========================================
pause
