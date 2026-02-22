#!/bin/bash

echo "========================================"
echo "ER Command Center - Setup Script"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running. Please start Docker first."
    exit 1
fi

echo "[1/5] Checking environment files..."
if [ -f "Code Base Backend/.env" ]; then
    echo "[INFO] Backend .env file found!"
else
    echo "[WARNING] Backend .env file not found. Please create it from .env.example"
    echo "Copy 'Code Base Backend/.env.example' to 'Code Base Backend/.env'"
    read -p "Press Enter to continue..."
fi

if [ -f "Code Base Frontend/.env" ]; then
    echo "[INFO] Frontend .env file found!"
else
    echo "[WARNING] Frontend .env not found. Creating default..."
    cat > "Code Base Frontend/.env" << EOF
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=ER Command Center
VITE_ENV=development
EOF
fi

echo ""
echo "[2/5] Setting up Backend (Docker)..."
cd "Code Base Backend"
echo "Starting PostgreSQL, Redis, and Backend API..."
docker-compose up -d postgres redis

echo "Waiting for database to initialize (20 seconds)..."
sleep 20

docker-compose up -d backend

echo "Backend services started!"
cd ..

echo ""
echo "[3/5] Installing Frontend Dependencies..."
cd "Code Base Frontend"
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "Dependencies already installed!"
fi
cd ..

echo ""
echo "[4/5] Starting Frontend Development Server..."
cd "Code Base Frontend"
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "[5/5] Setup Complete!"
echo ""
echo "========================================"
echo "Services Running:"
echo "========================================"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/api/docs"
echo "Frontend: http://localhost:5173 or http://localhost:3000"
echo "Database: localhost:5432 (user: postgres, db: demo_health)"
echo ""
echo "Demo Credentials:"
echo "  Nurse:  priya@hospital.com / nurse123"
echo "  Doctor: ananya@hospital.com / doctor123"
echo "  Admin:  rajesh@hospital.com / admin123"
echo ""
echo "To stop services:"
echo "  cd 'Code Base Backend' && docker-compose down"
echo "  kill $FRONTEND_PID  # Stop frontend"
echo "========================================"
echo ""
