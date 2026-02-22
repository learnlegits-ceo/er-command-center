# ER Command Center - Backend API

Multi-tenant AI-powered Emergency Room management system with intelligent triage using Groq LLM.

## 🚀 Quick Start with Docker

### Prerequisites
- Docker Desktop installed
- Groq API Key ([Get one free](https://console.groq.com))

### 1. Setup Environment

```bash
cd "Code Base Backend"

# Copy environment file
copy .env.example .env

# Edit .env and add your GROQ_API_KEY
notepad .env
```

### 2. Start Everything

```bash
# Start all services (PostgreSQL + Redis + Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Check status
docker-compose ps
```

### 3. Access API

- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/health

That's it! The database schema is automatically applied on first startup.

## 🔔 Background Jobs & Notifications

The system uses [Trigger.dev](https://trigger.dev) for background job processing and notifications:

- **Email** notifications via Resend
- **Push** notifications (Firebase/OneSignal)
- **Critical alerts** for vital signs
- **Scheduled jobs** (follow-ups, data cleanup)

See [trigger/README.md](trigger/README.md) for setup instructions.

## 📦 What's Included

The Docker setup includes:
- **Backend API** (FastAPI) on port 8000
- **PostgreSQL** database on port 5432
- **Redis** cache on port 6379
- **Nginx** reverse proxy (optional for production)

## 🛠️ Development

### View Logs
```bash
docker-compose logs -f backend      # Backend only
docker-compose logs -f postgres     # Database only
docker-compose logs -f              # All services
```

### Access Services
```bash
# Backend shell
docker-compose exec backend bash

# Database shell
docker-compose exec postgres psql -U postgres -d er_command_center

# Redis CLI
docker-compose exec redis redis-cli
```

### Restart Services
```bash
docker-compose restart backend      # Restart backend only
docker-compose restart              # Restart all
docker-compose down && docker-compose up -d  # Full restart
```

### Stop Everything
```bash
docker-compose down                 # Stop containers
docker-compose down -v              # Stop and remove data
```

## 🔧 Database Management

### Run Migrations
```bash
docker-compose exec backend alembic upgrade head
```

### Create New Migration
```bash
docker-compose exec backend alembic revision --autogenerate -m "add new field"
```

### Reset Database
```bash
docker-compose down -v
docker-compose up -d
```

## 🧪 Testing

```bash
# Run all tests
docker-compose exec backend pytest

# With coverage
docker-compose exec backend pytest --cov=app

# Specific test file
docker-compose exec backend pytest tests/test_auth.py -v
```

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh-token` - Refresh JWT token

### Patients
- `GET /api/v1/patients` - List all patients
- `POST /api/v1/patients` - Register new patient
- `GET /api/v1/patients/{id}` - Get patient details
- `POST /api/v1/patients/{id}/discharge` - Discharge patient

### AI Triage
- `POST /api/v1/triage/quick` - Quick triage (no patient)
- `POST /api/v1/patients/{id}/triage` - Run AI triage

### Vitals
- `POST /api/v1/patients/{id}/vitals` - Record vitals
- `POST /api/v1/vitals/ocr` - Extract vitals from image

### Dashboard
- `GET /api/v1/dashboard/stats` - Get statistics
- `GET /api/v1/dashboard/occupancy` - Bed occupancy

[Full API documentation at /api/docs](http://localhost:8000/api/docs)

## 🌍 Deployment

### Deploy to AWS ECS/Fargate

```bash
# Build image
docker build -t er-backend .

# Tag for ECR
docker tag er-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/er-backend

# Push
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/er-backend
```

### Deploy to Google Cloud Run

```bash
gcloud builds submit --tag gcr.io/<project-id>/er-backend
gcloud run deploy er-backend --image gcr.io/<project-id>/er-backend
```

### Deploy to Azure Container Apps

```bash
az containerapp create \
  --name er-backend \
  --resource-group <rg> \
  --image <registry>.azurecr.io/er-backend
```

### Deploy to Any VPS (DigitalOcean, Linode, etc.)

```bash
# Copy docker-compose.yml to server
scp docker-compose.yml user@server:/app/

# SSH to server
ssh user@server

# Start services
cd /app
docker-compose up -d
```

## 🔐 Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Password hashing (bcrypt)
- ✅ 2FA support (TOTP)
- ✅ Row-level security in database
- ✅ Rate limiting (via Nginx)
- ✅ CORS configuration
- ✅ Non-root Docker containers

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Check environment variables
docker-compose exec backend env | grep DATABASE_URL

# Restart
docker-compose restart backend
```

### Database connection failed
```bash
# Check if postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Port already in use
```bash
# Edit docker-compose.yml and change ports:
# "8001:8000" instead of "8000:8000"
# "5433:5432" instead of "5432:5432"
```

## 📚 Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Async ORM
- **PostgreSQL** - Database
- **Redis** - Caching
- **Groq** - AI LLM for triage
- **Trigger.dev** - Background jobs & notifications
- **Docker** - Containerization
- **Nginx** - Reverse proxy

## 📝 License

MIT License

## 🆘 Support

For issues, please check the logs first:
```bash
docker-compose logs -f
```

Or open a GitHub issue.
