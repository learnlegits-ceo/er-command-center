# Windows Quick Start Guide

This guide helps you start the ER Command Center on Windows.

---

## Choose Your Setup Method

### Method 1: Using Docker (Recommended) ✅

**Pros:** Easy, consistent, includes database
**Cons:** Requires Docker Desktop installation

### Method 2: Without Docker (Manual)

**Pros:** No Docker needed
**Cons:** Need to install PostgreSQL, Redis manually

---

## Method 1: Setup with Docker

### Prerequisites
- Windows 10/11 (64-bit)
- At least 4GB RAM
- Internet connection

### Step 1: Install Docker Desktop

1. **Download Docker Desktop:**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Run the installer (Docker Desktop Installer.exe)

2. **Install Requirements:**
   - During installation, enable WSL 2 if prompted
   - Restart computer when asked

3. **Start Docker Desktop:**
   - Open Docker Desktop from Start Menu
   - Wait for it to fully start (whale icon in system tray)
   - Accept the license agreement

4. **Verify Installation:**
   ```cmd
   docker --version
   docker compose version
   ```
   Both should show version numbers.

### Step 2: Run the Setup Script

Simply double-click: **`setup.bat`**

Or from Command Prompt:
```cmd
cd "C:\Lasya\Healthcare Project\Code"
setup.bat
```

### What the Script Does:
- ✅ Checks environment files
- ✅ Starts PostgreSQL database
- ✅ Starts Redis cache
- ✅ Starts Backend API
- ✅ Installs frontend dependencies
- ✅ Starts frontend development server

### Step 3: Access the Application

Wait about 30 seconds for everything to start, then open:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/api/docs

### Demo Login Credentials:
- Nurse: `priya@hospital.com` / `nurse123`
- Doctor: `ananya@hospital.com` / `doctor123`
- Admin: `rajesh@hospital.com` / `admin123`

---

## Method 2: Setup WITHOUT Docker

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm
- PostgreSQL 15
- Redis (optional)

### Step 1: Install Prerequisites

#### Install Python 3.10+
1. Download from: https://www.python.org/downloads/
2. **Important:** Check "Add Python to PATH" during installation
3. Verify:
   ```cmd
   python --version
   ```

#### Install Node.js 18+
1. Download from: https://nodejs.org/ (LTS version)
2. Install with default options
3. Verify:
   ```cmd
   node --version
   npm --version
   ```

#### Install PostgreSQL 15
1. Download from: https://www.postgresql.org/download/windows/
2. During installation:
   - Remember the password you set for `postgres` user
   - Default port: 5432
3. After installation, create database:
   ```cmd
   # Open Command Prompt
   "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres

   # In psql prompt:
   CREATE DATABASE demo_health;
   \q
   ```

4. Load schema and demo data:
   ```cmd
   cd "C:\Lasya\Healthcare Project\Code\Code Base Backend"
   "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d demo_health -f database_schema.sql
   "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d demo_health -f demo_health.sql
   ```

### Step 2: Configure Backend

1. **Copy environment file:**
   ```cmd
   cd "C:\Lasya\Healthcare Project\Code\Code Base Backend"
   copy .env.example .env
   ```

2. **Edit `.env` file:**
   - Open `.env` in Notepad
   - Update the database password (if you set a different one):
     ```env
     DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/demo_health
     DATABASE_SYNC_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/demo_health
     ```

### Step 3: Start Backend

Double-click: **`start-without-docker.bat`**

Or manually:
```cmd
cd "C:\Lasya\Healthcare Project\Code\Code Base Backend"
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Keep this window open. Backend is running at http://localhost:8000

### Step 4: Start Frontend

**Open a NEW Command Prompt window**, then:

Double-click: **`start-frontend-only.bat`**

Or manually:
```cmd
cd "C:\Lasya\Healthcare Project\Code\Code Base Frontend"
npm install
npm run dev
```

Keep this window open. Frontend is running at http://localhost:5173

### Step 5: Access the Application

Open browser to: http://localhost:5173

Demo credentials:
- Nurse: `priya@hospital.com` / `nurse123`
- Doctor: `ananya@hospital.com` / `doctor123`
- Admin: `rajesh@hospital.com` / `admin123`

---

## Common Issues & Solutions

### Issue: "docker: command not found"
**Solution:** Install Docker Desktop (Method 1) or use Method 2

### Issue: "Python not found"
**Solution:**
1. Install Python from https://www.python.org/
2. During install, CHECK "Add Python to PATH"
3. Restart Command Prompt

### Issue: "npm not found"
**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart Command Prompt

### Issue: "Port 8000 is already in use"
**Solution:**
```cmd
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F
```

### Issue: "Port 5173 is already in use"
**Solution:**
```cmd
# Find what's using port 5173
netstat -ano | findstr :5173

# Kill the process
taskkill /PID <PID> /F
```

### Issue: "Cannot connect to database"
**Solution:**
1. Check PostgreSQL is running:
   - Open Services (Win+R, type `services.msc`)
   - Find "postgresql-x64-15" service
   - Make sure it's "Running"
2. Check password in `.env` matches PostgreSQL password
3. Try connecting manually:
   ```cmd
   "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d demo_health
   ```

### Issue: "Module not found" errors in Python
**Solution:**
```cmd
cd "Code Base Backend"
venv\Scripts\activate.bat
pip install -r requirements.txt --force-reinstall
```

### Issue: Frontend shows "Cannot connect to backend"
**Solution:**
1. Check backend is running at http://localhost:8000
2. Visit http://localhost:8000/health - should show "healthy"
3. Check `.env` file in frontend has:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```
4. Restart frontend:
   ```cmd
   # Press Ctrl+C in frontend terminal
   npm run dev
   ```

---

## Stopping Services

### If using Docker:
```cmd
cd "Code Base Backend"
docker compose down
```

### If NOT using Docker:
- Press `Ctrl+C` in each Command Prompt window (backend and frontend)

---

## Next Steps

1. ✅ Login with demo credentials
2. ✅ Explore the dashboard
3. ✅ Try adding a new patient
4. ✅ Check the API documentation: http://localhost:8000/api/docs
5. ✅ Read [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for full testing guide

---

## Need More Help?

- **Setup Guide:** [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Testing Guide:** [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
- **Backend .env.example:** See what needs to be configured

---

**Quick Reference:**

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | See demo credentials above |
| Backend API | http://localhost:8000 | - |
| API Docs | http://localhost:8000/api/docs | - |
| Database | localhost:5432 | postgres / your_password |
