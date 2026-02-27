#!/usr/bin/env bash
# ER Command Center — Service Health Check
# Usage: ./verify.sh
# Works on: Linux, macOS, Windows (Git Bash / WSL)

BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "  ${YELLOW}[WARN]${NC}  $1"; }
fail() { echo -e "  ${RED}[FAIL]${NC}  $1"; }

echo -e "${BOLD}========================================"
echo   "  ER Command Center — Health Check"
echo -e "========================================${NC}"
echo ""

PASS=0

# ── 1. Docker ────────────────────────────────────────────────
echo "[1/5] Docker"
if docker info > /dev/null 2>&1; then
    ok "Docker is running."; PASS=$((PASS+1))
else
    fail "Docker is not running — start Docker Desktop first."
fi

# ── 2. PostgreSQL ────────────────────────────────────────────
echo ""
echo "[2/5] PostgreSQL"
if docker ps --format '{{.Names}}' | grep -qx "er_postgres"; then
    ok "Container er_postgres is running."; PASS=$((PASS+1))
else
    fail "Container er_postgres is not running."
    echo "       Fix: docker compose up -d postgres"
fi

# ── 3. Backend API ───────────────────────────────────────────
echo ""
echo "[3/5] Backend API"
if curl -sf "$BACKEND_URL/health" > /dev/null 2>&1; then
    RESP=$(curl -s "$BACKEND_URL/health")
    ok "Responding at $BACKEND_URL  $RESP"; PASS=$((PASS+1))
else
    fail "Not responding at $BACKEND_URL"
    echo "       Fix:  docker compose up -d backend"
    echo "       Logs: docker compose logs backend"
fi

# ── 4. API Docs ──────────────────────────────────────────────
echo ""
echo "[4/5] API Docs"
if curl -sf "$BACKEND_URL/docs" > /dev/null 2>&1; then
    ok "Available at $BACKEND_URL/docs"
else
    warn "Not accessible — ensure DEBUG=true in .env"
fi

# ── 5. Frontend ──────────────────────────────────────────────
echo ""
echo "[5/5] Frontend"
if curl -sf "$FRONTEND_URL" > /dev/null 2>&1; then
    ok "Running at $FRONTEND_URL"; PASS=$((PASS+1))
else
    warn "Not running at $FRONTEND_URL"
    echo "       Fix: cd 'Code Base Frontend' && npm run dev"
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}========================================"
echo   "  Result: $PASS/4 critical checks passed"
echo -e "========================================${NC}"

if [ "$PASS" -eq 4 ]; then
    echo ""
    echo "  All services are running!"
    echo ""
    echo "  Frontend:    $FRONTEND_URL"
    echo "  Backend API: $BACKEND_URL"
    echo "  API Docs:    $BACKEND_URL/docs"
    echo ""
    echo "  Demo: priya@hospital.com / nurse123"
else
    echo ""
    echo "  Some services are not running — see FAIL/WARN lines above."
    echo "  Quick fix: docker compose up -d"
fi
echo "========================================"
