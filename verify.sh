#!/bin/bash

echo "========================================"
echo "ER Command Center - Service Verification"
echo "========================================"
echo ""

BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"
DB_HOST="localhost"
DB_PORT=5432
REDIS_PORT=6379

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "[1/6] Checking Docker..."
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Docker is running"
    DOCKER_OK="YES"
else
    echo -e "${RED}[FAIL]${NC} Docker is not running"
    DOCKER_OK="NO"
fi

echo ""
echo "[2/6] Checking PostgreSQL Database..."
if docker ps | grep -q er_postgres; then
    echo -e "${GREEN}[OK]${NC} PostgreSQL container is running"
    DB_OK="YES"
else
    echo -e "${RED}[FAIL]${NC} PostgreSQL container is not running"
    echo "  Fix: cd 'Code Base Backend' && docker-compose up -d postgres"
    DB_OK="NO"
fi

echo ""
echo "[3/6] Checking Redis Cache..."
if docker ps | grep -q er_redis; then
    echo -e "${GREEN}[OK]${NC} Redis container is running"
    REDIS_OK="YES"
else
    echo -e "${YELLOW}[WARN]${NC} Redis container is not running (optional)"
    echo "  Fix: cd 'Code Base Backend' && docker-compose up -d redis"
    REDIS_OK="NO"
fi

echo ""
echo "[4/6] Checking Backend API..."
if curl -s -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Backend API is responding"
    HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
    echo "  Response: $HEALTH_RESPONSE"
    BACKEND_OK="YES"
else
    echo -e "${RED}[FAIL]${NC} Backend API is not responding"
    echo "  Fix: cd 'Code Base Backend' && docker-compose up -d backend"
    echo "  Then check logs: docker-compose logs backend"
    BACKEND_OK="NO"
fi

echo ""
echo "[5/6] Checking Backend API Documentation..."
if curl -s -f "$BACKEND_URL/api/docs" > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} API docs available at $BACKEND_URL/api/docs"
else
    echo -e "${YELLOW}[WARN]${NC} API docs not accessible (check if DEBUG=true in .env)"
fi

echo ""
echo "[6/6] Checking Frontend..."
if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Frontend is running at $FRONTEND_URL"
    FRONTEND_OK="YES"
else
    echo -e "${YELLOW}[WARN]${NC} Frontend is not running"
    echo "  Fix: cd 'Code Base Frontend' && npm run dev"
    FRONTEND_OK="NO"
fi

echo ""
echo "========================================"
echo "Service Status Summary"
echo "========================================"
echo "Docker:      $DOCKER_OK"
echo "PostgreSQL:  $DB_OK"
echo "Redis:       $REDIS_OK"
echo "Backend API: $BACKEND_OK"
echo "Frontend:    $FRONTEND_OK"
echo "========================================"

echo ""
if [ "$DOCKER_OK" = "YES" ] && [ "$DB_OK" = "YES" ] && [ "$BACKEND_OK" = "YES" ] && [ "$FRONTEND_OK" = "YES" ]; then
    echo -e "${GREEN}[SUCCESS]${NC} All services are running!"
    echo ""
    echo "Quick Links:"
    echo "  Frontend:  $FRONTEND_URL"
    echo "  Backend:   $BACKEND_URL"
    echo "  API Docs:  $BACKEND_URL/api/docs"
    echo ""
    echo "Demo Credentials:"
    echo "  Nurse:  priya@hospital.com / nurse123"
    echo "  Doctor: ananya@hospital.com / doctor123"
    echo "  Admin:  rajesh@hospital.com / admin123"
else
    echo -e "${YELLOW}[WARNING]${NC} Some services are not running."
    echo "Please check the failures above and fix them."
    echo ""
    echo "Common fixes:"
    echo "  1. Start Docker Desktop"
    echo "  2. cd 'Code Base Backend' && docker-compose up -d"
    echo "  3. cd 'Code Base Frontend' && npm run dev"
fi

echo ""
echo "========================================"
