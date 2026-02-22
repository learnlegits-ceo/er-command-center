# ER Command Center - Healthcare Management System

Multi-tenant AI-powered Emergency Room management with intelligent triage using Groq LLM.

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Frontend      │ ◄─────► │   Backend API    │
│   (React)       │         │   (FastAPI)      │
│   Port 5173     │         │   Port 8000      │
└─────────────────┘         └────────┬─────────┘
                                     │
                    ┌────────────────┼────────────┐
                    │                │            │
              ┌─────▼─────┐    ┌────▼────┐  ┌───▼────┐
              │PostgreSQL │    │  Redis  │  │  Groq  │
              │   :5432   │    │  :6379  │  │  LLM   │
              └───────────┘    └─────────┘  └────────┘
```

## 🚀 Quick Start (All-in-One Development)

### Start Everything with One Command

```bash
cd Code

# Copy environment file
copy "Code Base Backend\.env.example" .env

# Add your Groq API key to .env
notepad .env

# Start frontend + backend + database
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### Stop Everything

```bash
docker-compose -f docker-compose.dev.yml down
```

---

## 📁 Project Structure

```
Code/
├── Code Base Frontend/          # React + TypeScript + Vite
│   ├── src/
│   ├── package.json
│   ├── Dockerfile.dev          # Dev container
│   └── Dockerfile              # Production container
│
├── Code Base Backend/           # FastAPI + PostgreSQL
│   ├── app/
│   │   ├── api/routes/         # API endpoints
│   │   ├── models/             # Database models
│   │   ├── services/           # Business logic
│   │   └── main.py             # App entry
│   ├── database_schema.sql
│   ├── docker-compose.yml      # Backend only (production)
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.dev.yml       # Full stack (development)
└── README.md                    # This file
```

---

## 🎯 Deployment Strategies

### Strategy 1: Separate Deployment ✅ Recommended for Production

**Frontend → Vercel/Netlify** (Free, Global CDN)
```bash
cd "Code Base Frontend"
vercel deploy
```

**Backend → Docker** (AWS/DigitalOcean/GCP)
```bash
cd "Code Base Backend"
docker-compose up -d
```

**Pros:**
- Frontend on global CDN (super fast)
- Independent scaling
- Backend can use more resources
- Free frontend hosting

### Strategy 2: Combined Deployment (Staging/Demo)

**Both → Single Docker Host**
```bash
cd Code
docker-compose -f docker-compose.dev.yml up -d
```

**Pros:**
- One server, simpler setup
- Good for staging/demo
- Lower cost for small deployments

---

## 🛠️ Development Workflows

### Option A: Docker (Everything Containerized)

```bash
# Start all services
cd Code
docker-compose -f docker-compose.dev.yml up -d

# Frontend will auto-reload on file changes
# Backend will auto-reload on file changes
```

### Option B: Hybrid (DB in Docker, Apps Local)

```bash
# Start only database & redis
cd "Code Base Backend"
docker-compose up -d postgres redis

# Run backend locally
cd "Code Base Backend"
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Run frontend locally (separate terminal)
cd "Code Base Frontend"
npm install
npm run dev
```

**Use Hybrid when:**
- You want faster hot-reload
- You're debugging with breakpoints
- You prefer native IDE integration

---

## 📦 What Each Docker Setup Does

### 1. `Code Base Backend/docker-compose.yml`
**Purpose:** Backend only (for production deployment)

**Includes:**
- PostgreSQL database
- Redis cache
- Backend API
- Nginx (optional)

**Use when:**
- Deploying backend to production
- Frontend is on Vercel/Netlify

### 2. `Code/docker-compose.dev.yml`
**Purpose:** Full stack (for local development)

**Includes:**
- Everything from above
- Frontend dev server
- Hot reload for both frontend & backend

**Use when:**
- Local development
- Want to start everything with one command
- Testing full integration

---

## 🌍 Production Deployment Examples

### Deploy Frontend to Vercel

```bash
cd "Code Base Frontend"

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add VITE_API_URL production
# Enter: https://your-backend-api.com/api/v1
```

### Deploy Backend to DigitalOcean

```bash
# 1. Create droplet with Docker
# 2. SSH to droplet
ssh root@your-droplet-ip

# 3. Clone and setup
git clone <your-repo>
cd "Code Base Backend"
cp .env.example .env
nano .env  # Add credentials

# 4. Start backend
docker-compose up -d

# 5. Setup domain (optional)
# Point your domain to droplet IP
# Backend accessible at: https://api.yourdomain.com
```

### Deploy Backend to AWS ECS

```bash
cd "Code Base Backend"

# Build and push to ECR
docker build -t er-backend .
docker tag er-backend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/er-backend
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/er-backend

# Deploy via ECS Console or CLI
aws ecs update-service --cluster er-cluster --service er-backend --force-new-deployment
```

---

## 🔧 Environment Variables

### Backend (.env)
```bash
# Required
GROQ_API_KEY=gsk_your_key_here
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/db
SECRET_KEY=your-secret-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key

# Optional
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
SQS_NOTIFICATION_QUEUE_URL=...
```

### Frontend (.env)
```bash
# API endpoint
VITE_API_URL=http://localhost:8000/api/v1

# For production
VITE_API_URL=https://api.yourdomain.com/api/v1
```

---

## 🧪 Testing

```bash
# Backend tests
cd "Code Base Backend"
docker-compose exec backend pytest

# Frontend tests
cd "Code Base Frontend"
npm test
```

---

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Backend only
docker-compose -f docker-compose.dev.yml logs -f backend

# Frontend only
docker-compose -f docker-compose.dev.yml logs -f frontend

# Database
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Check Health

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:5173/health

# Database
docker-compose exec postgres pg_isready
```

---

## 🎓 Learning Resources

- **FastAPI**: https://fastapi.tiangolo.com
- **React**: https://react.dev
- **Docker**: https://docs.docker.com
- **Groq**: https://console.groq.com/docs

---

## 📝 Common Commands Cheatsheet

```bash
# Start everything
docker-compose -f docker-compose.dev.yml up -d

# Stop everything
docker-compose -f docker-compose.dev.yml down

# Restart backend only
docker-compose -f docker-compose.dev.yml restart backend

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Access backend shell
docker-compose -f docker-compose.dev.yml exec backend bash

# Access database
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d er_command_center

# Clean everything (including data)
docker-compose -f docker-compose.dev.yml down -v

# Rebuild after Dockerfile changes
docker-compose -f docker-compose.dev.yml up -d --build
```

---

## 🆘 Troubleshooting

### Backend won't start
```bash
docker-compose -f docker-compose.dev.yml logs backend
docker-compose -f docker-compose.dev.yml restart backend
```

### Frontend won't start
```bash
docker-compose -f docker-compose.dev.yml logs frontend
# Check if node_modules are installed
docker-compose -f docker-compose.dev.yml exec frontend npm install
```

### Database connection failed
```bash
docker-compose -f docker-compose.dev.yml logs postgres
docker-compose -f docker-compose.dev.yml restart postgres
```

### Port already in use
Edit `docker-compose.dev.yml` and change ports:
- `"5174:5173"` instead of `"5173:5173"`
- `"8001:8000"` instead of `"8000:8000"`

---

## 📜 License

MIT License

## 👥 Support

Open an issue on GitHub or check the logs for debugging.
