#!/usr/bin/env bash
# ER Command Center — First-time setup
# Usage: ./setup.sh
# Works on: Linux, macOS, Windows (Git Bash / WSL)
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "  ${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "  ${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "  ${RED}[ERROR]${NC} $1"; exit 1; }

echo -e "${BOLD}========================================"
echo   "  ER Command Center — Setup"
echo -e "========================================${NC}"
echo ""

# ── 1. Docker ────────────────────────────────────────────────
docker info > /dev/null 2>&1 || error "Docker is not running. Start Docker Desktop first."
info "Docker is running."

# ── 2. Environment file ───────────────────────────────────────
echo "[1/4] Environment file"
if [ -f ".env" ]; then
    info "Root .env found."
else
    warn ".env not found — copying from .env.example"
    cp .env.example .env
    echo ""
    echo "  ACTION: Open .env and fill in your secrets before continuing."
    echo "          Required: DATABASE_URL, JWT_SECRET_KEY, SECRET_KEY, GROQ_API_KEY"
    echo ""
    read -rp "  Press Enter once .env is ready..."
fi

# ── 3. Docker services ────────────────────────────────────────
echo ""
echo "[2/4] Starting PostgreSQL, Redis, and Backend API"
docker compose up -d postgres redis
echo "  Waiting 15 s for the database to initialise..."
sleep 15
docker compose up -d backend
info "Backend services started."

# ── 4. Frontend dependencies ──────────────────────────────────
echo ""
echo "[3/4] Frontend dependencies"
cd "Code Base Frontend"
if [ ! -d "node_modules" ]; then
    npm install
else
    info "node_modules already present."
fi
cd ..

# ── 5. Frontend dev server ────────────────────────────────────
echo ""
echo "[4/4] Starting Frontend dev server"
cd "Code Base Frontend"
npm run dev &
FRONTEND_PID=$!
cd ..
info "Frontend started (PID $FRONTEND_PID)."

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}========================================"
echo   "  All Services Running"
echo -e "========================================${NC}"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo ""
echo "  Demo credentials:"
echo "    Nurse:  priya@hospital.com  / nurse123"
echo "    Doctor: ananya@hospital.com / doctor123"
echo "    Admin:  rajesh@hospital.com / admin123"
echo ""
echo "  To stop:"
echo "    docker compose down        # backend + db"
echo "    kill $FRONTEND_PID         # frontend"
echo "========================================"
