# ER Command Center - Setup Guide

This guide will help you set up and run the ER Command Center Healthcare Management System.

## Prerequisites

Before starting, ensure you have the following installed:

- **Docker Desktop** (for backend database and services)
- **Node.js** v18+ and npm (for frontend)
- **Git** (optional, for version control)

### Verify Prerequisites

```bash
# Check Docker
docker --version
docker-compose --version

# Check Node.js and npm
node --version
npm --version
```

---

## Quick Start (Automated Setup)

We provide automated setup scripts for easy installation:

### Windows

```cmd
# Run from the project root directory
setup.bat
```

### Linux / macOS

```bash
# Make the script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

The setup script will:
1. Check environment files
2. Start backend services (Database, Redis, API)
3. Install frontend dependencies
4. Start the frontend development server

---

## Manual Setup

If you prefer to set up manually or the automated script doesn't work:

### Step 1: Configure Environment Files

#### Backend Environment

```bash
cd "Code Base Backend"
cp .env.example .env
```

Edit `.env` and configure:
- Database credentials (default works for Docker setup)
- JWT secret keys
- **Groq API key** (get from https://console.groq.com/) - Optional, AI triage works in mock mode without it
- Trigger.dev API key (optional)
- Resend API key (optional, for emails)

#### Frontend Environment

```bash
cd "Code Base Frontend"
```

Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=ER Command Center
VITE_ENV=development
```

### Step 2: Start Backend Services

```bash
cd "Code Base Backend"

# Start database and cache
docker-compose up -d postgres redis

# Wait for database to initialize (first time only)
# The database will automatically run schema and demo data scripts
sleep 20

# Start backend API
docker-compose up -d backend
```

**Verify backend is running:**
- API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### Step 3: Start Frontend

```bash
cd "Code Base Frontend"

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Access the application:**
- Frontend: http://localhost:5173 or http://localhost:3000

---

## Demo Credentials

The demo database includes the following users for testing:

| Role   | Email                  | Password   |
|--------|------------------------|------------|
| Nurse  | priya@hospital.com     | nurse123   |
| Doctor | ananya@hospital.com    | doctor123  |
| Admin  | rajesh@hospital.com    | admin123   |

---

## Database Setup Details

### Automatic Initialization (Docker)

When you run `docker-compose up` for the **first time**, PostgreSQL automatically:
1. Creates the database
2. Runs `database_schema.sql` (creates all tables)
3. Runs `demo_health.sql` (loads sample data)

This happens only on first startup. If you need to reset:

```bash
# Stop and remove everything
cd "Code Base Backend"
docker-compose down -v

# Start fresh (will reinitialize database)
docker-compose up -d
```

### Manual Database Setup (Without Docker)

If you're using a local PostgreSQL installation:

```bash
# Create database
createdb demo_health

# Run schema
psql -d demo_health -f database_schema.sql

# Load demo data
psql -d demo_health -f demo_health.sql
```

Update the `.env` file with your local database connection:
```env
DATABASE_URL=postgresql+asyncpg://YOUR_USER:YOUR_PASSWORD@localhost:5432/demo_health
DATABASE_SYNC_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/demo_health
```

---

## Verification Steps

After setup, verify everything is working:

### 1. Check Backend Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "app": "ER Command Center",
  "version": "1.0.0"
}
```

### 2. Check Database Connection

```bash
# View backend logs
cd "Code Base Backend"
docker-compose logs backend
```

Look for: "Starting ER Command Center..." (no database errors)

### 3. Check Frontend

Open http://localhost:5173 in your browser. You should see the login page.

### 4. Test Login

Login with any demo credentials. You should be redirected to the dashboard.

---

## Troubleshooting

### Backend won't start

**Issue:** Port 8000 already in use
```bash
# Find and kill the process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:8000 | xargs kill
```

**Issue:** Database connection failed
- Check if PostgreSQL container is running: `docker ps`
- Check database logs: `docker-compose logs postgres`
- Verify `.env` DATABASE_URL is correct

### Frontend won't start

**Issue:** Port 5173 already in use
```bash
# Kill the process
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5173 | xargs kill
```

**Issue:** Dependencies installation failed
```bash
# Clear npm cache and reinstall
cd "Code Base Frontend"
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Database issues

**Issue:** Tables don't exist
```bash
# Reset the database
cd "Code Base Backend"
docker-compose down -v
docker-compose up -d
```

**Issue:** Demo users don't exist
```bash
# Manually load demo data
docker exec -i er_postgres psql -U postgres -d demo_health < demo_health.sql
```

### API calls failing (401 Unauthorized)

- Clear browser localStorage
- Login again with demo credentials
- Check browser console for specific errors

---

## Stopping Services

### Stop All Services

```bash
cd "Code Base Backend"
docker-compose down

# Stop frontend (if running in background)
# Press Ctrl+C in the terminal where npm run dev is running
```

### Stop and Remove All Data

```bash
cd "Code Base Backend"
docker-compose down -v  # -v removes volumes (database data)
```

---

## Development Workflow

### Start Development Session

1. Start backend:
   ```bash
   cd "Code Base Backend"
   docker-compose up -d
   ```

2. Start frontend:
   ```bash
   cd "Code Base Frontend"
   npm run dev
   ```

### View Logs

```bash
# Backend logs
cd "Code Base Backend"
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres
```

### Access Database Directly

```bash
docker exec -it er_postgres psql -U postgres -d demo_health
```

### API Documentation

Visit http://localhost:8000/api/docs for interactive API documentation (Swagger UI)

---

## Production Build

### Frontend Production Build

```bash
cd "Code Base Frontend"
npm run build

# Output will be in the 'dist' folder
# Serve with:
npm run preview
```

### Backend Production Deployment

The backend is already containerized. For production:

1. Update `docker-compose.yml` environment variables for production
2. Set strong SECRET_KEY and JWT_SECRET_KEY
3. Use production database (not demo_health)
4. Enable Nginx service:
   ```bash
   docker-compose --profile production up -d
   ```

---

## Additional Configuration

### Enable AI Triage (Groq)

1. Get API key from https://console.groq.com/
2. Update `.env`:
   ```env
   GROQ_API_KEY=your_actual_api_key_here
   ```
3. Restart backend:
   ```bash
   docker-compose restart backend
   ```

### Enable Email Notifications (Resend)

1. Get API key from https://resend.com/
2. Update `.env`:
   ```env
   RESEND_API_KEY=your_resend_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ```
3. Restart backend

---

## Project Structure

```
ER Command Center/
├── Code Base Backend/       # FastAPI Backend
│   ├── app/                # Application code
│   ├── alembic/            # Database migrations
│   ├── database_schema.sql # Database schema
│   ├── demo_health.sql     # Demo data
│   ├── docker-compose.yml  # Docker services
│   └── .env                # Backend config
├── Code Base Frontend/      # React Frontend
│   ├── src/                # Source code
│   ├── public/             # Static assets
│   └── .env                # Frontend config
├── setup.bat               # Windows setup script
├── setup.sh                # Unix setup script
└── SETUP_GUIDE.md          # This file
```

---

## Support

If you encounter issues not covered in this guide:

1. Check the logs for specific error messages
2. Verify all prerequisites are installed
3. Ensure ports 8000, 5432, 6379, and 5173 are not in use
4. Try the "reset everything" approach:
   ```bash
   cd "Code Base Backend"
   docker-compose down -v
   docker-compose up -d
   ```

---

## Next Steps

Once everything is running:

1. Login with demo credentials
2. Explore the dashboard
3. Try adding a new patient
4. Test the AI triage feature
5. Manage beds and alerts
6. Review the API documentation at http://localhost:8000/api/docs

Happy coding! 🏥
