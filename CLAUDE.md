# CLAUDE.md — ER Command Center

AI assistant guide for the **ER Command Center** — a multi-tenant, AI-powered Emergency Room management system.

---

## Project Overview

A full-stack healthcare platform that helps hospital ER staff manage patients, beds, triage, alerts, prescriptions, and police cases in real time.

| Layer      | Stack                                          |
|------------|------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend    | FastAPI (Python 3.11), SQLAlchemy 2 async, Alembic, PostgreSQL |
| AI         | Groq (Llama 3.3 70B) for AI triage            |
| Auth       | JWT (python-jose) + bcrypt via passlib         |
| Jobs       | AWS Lambda + SQS (`er-cmd-jobs-queue` → `er-cmd-jobs-processor`) |
| Deployment | AWS — Lambda (backend container image), S3 + CloudFront (frontend), RDS PostgreSQL, ap-south-1 |

---

## Repository Structure

```
/
├── CLAUDE.md                          # This file
├── README.md                          # Project overview
├── .env.example                       # ★ Single env template — copy to .env
├── .env                               # ⚠️ Your local secrets — never commit
├── .gitignore
├── aws-deploy.sh                      # AWS deployment script (build → ECR → Lambda + S3 → CloudFront)
├── aws-teardown.sh                    # ⚠️ Nuke all AWS resources for this project
├── aws-deploy-state.env               # Tracked AWS resource IDs (gitignored)
├── docker-compose.yml                 # ★ Single compose file (dev full-stack)
├── setup.sh                           # First-time setup (Linux / Mac / Windows Git Bash)
├── verify.sh                          # Health-check all running services
│
├── Code Base Backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── api/
│   │   │   ├── __init__.py            # api_router — registers all routes
│   │   │   └── routes/                # One router file per domain
│   │   │       ├── auth.py
│   │   │       ├── patients.py
│   │   │       ├── vitals.py
│   │   │       ├── triage.py
│   │   │       ├── notes.py
│   │   │       ├── prescriptions.py
│   │   │       ├── beds.py
│   │   │       ├── alerts.py
│   │   │       ├── police_cases.py
│   │   │       ├── dashboard.py
│   │   │       ├── departments.py
│   │   │       ├── admin.py
│   │   │       └── users.py
│   │   ├── core/
│   │   │   ├── config.py              # Settings — reads root .env automatically
│   │   │   ├── security.py            # JWT + password hashing
│   │   │   └── dependencies.py        # FastAPI dependency injectors
│   │   ├── db/
│   │   │   └── database.py            # Async SQLAlchemy engine + session
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   └── services/                  # Business logic
│   │       ├── triage.py              # Groq AI triage
│   │       ├── notification.py        # Notification dispatcher
│   │       ├── jobs.py                # Trigger.dev client (graceful mock fallback)
│   │       ├── assignment.py
│   │       ├── email.py
│   │       └── mcp.py
│   ├── alembic/                       # Database migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── scripts/                       # Dev/ops utility scripts
│   │   ├── README.md
│   │   ├── check_db.py                # Diagnose DB connection and data
│   │   ├── reset_db.py                # ⚠️ Wipe and recreate schema
│   │   ├── database_schema.sql        # Full DDL (also used by Docker init)
│   │   ├── seed_data.sql              # Raw SQL seed data
│   │   └── add_department_patients.sql
│   ├── trigger/                       # Trigger.dev job definitions (TypeScript)
│   │   ├── jobs.ts
│   │   ├── trigger.config.ts
│   │   └── package.json
│   ├── seed_data.py                   # Python seeder (preferred over SQL)
│   ├── setup_all.py                   # First-time DB setup (create + seed)
│   ├── Dockerfile                     # Production image (includes AWS Lambda Web Adapter)
│   ├── Makefile                       # Docker helper targets
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── lambda/jobs_processor.py       # SQS consumer Lambda (separate function)
│   └── start.sh                       # Docker CMD: migrate (if RUN_MIGRATIONS=true) → uvicorn
│
└── Code Base Frontend/                # React + Vite frontend
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── ui/                    # shadcn/ui primitives
    │   │   ├── dashboard/
    │   │   ├── AlertBanner.tsx
    │   │   ├── BedCard.tsx
    │   │   ├── Layout.tsx
    │   │   ├── PatientCard.tsx
    │   │   └── StatsCard.tsx
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── Patients.tsx
    │   │   ├── Beds.tsx
    │   │   ├── Alerts.tsx
    │   │   ├── OPD.tsx
    │   │   ├── Admin.tsx
    │   │   ├── Login.tsx
    │   │   ├── ForgotPassword.tsx
    │   │   ├── Profile.tsx
    │   │   └── Settings.tsx
    │   ├── hooks/                     # TanStack Query hooks
    │   ├── contexts/                  # AppContext, UserContext
    │   ├── lib/
    │   │   ├── api.ts                 # Axios instance + all endpoint definitions
    │   │   └── utils.ts               # cn() helper
    │   └── data/
    │       ├── types.ts               # Shared TypeScript types
    │       └── mockData.ts            # Dev fallback data
    ├── public/
    ├── index.html
    ├── vite.config.ts                 # envDir points to repo root
    ├── tailwind.config.ts
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── components.json                # shadcn/ui config
    ├── Dockerfile                     # Production image (nginx)
    ├── Dockerfile.dev                 # Dev image (vite dev server, used by compose)
    ├── nginx.conf
    └── package.json
```

---

## Environment Variables — Single Root `.env`

**One file rules everything.** Copy `.env.example` → `.env` at the repo root and fill in your values.

- **Backend** (`app/core/config.py`) reads `../../.env` → `../.env` → `.env` in that priority order.
- **Frontend** (`vite.config.ts`) sets `envDir: path.resolve(__dirname, '..')` → reads root `.env`.
- **Docker Compose** passes secrets from root `.env` via `env_file: .env` in the backend service.

### Key Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://...` (async, for app) |
| `DATABASE_SYNC_URL` | Yes | `postgresql://...` (sync, for Alembic) |
| `JWT_SECRET_KEY` | Yes | Random 32+ char secret |
| `SECRET_KEY` | Yes | App secret key |
| `GROQ_API_KEY` | Yes | Groq AI for triage |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `TRIGGER_API_KEY` | No | Trigger.dev jobs — blank = mock mode |
| `RESEND_API_KEY` | No | Email notifications |
| `REDIS_URL` | No | Caching — blank to disable |
| `AWS_*` / `S3_*` | No | File upload to S3 — blank to disable |
| `VITE_API_BASE_URL` | — | Frontend API URL (read by Vite from root .env) |

---

## Development Setup

### Quickest start (Docker — everything)

```bash
cp .env.example .env        # fill in secrets, then:
./setup.sh

./verify.sh                 # confirm all services are healthy
```

Services:
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

### Backend only (local Python, no Docker)

```bash
cd "Code Base Backend"

python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# .env is at repo root — config.py finds it automatically
python setup_all.py             # one-time: creates tables + seeds data

uvicorn app.main:app --reload --port 8000
```

### Frontend only (local Node)

```bash
cd "Code Base Frontend"
npm install
npm run dev                     # reads VITE_* vars from root .env via envDir
```

---

## Common Commands

### Backend

```bash
# DB migrations
alembic revision --autogenerate -m "description"
alembic upgrade head

# Diagnostics
python scripts/check_db.py

# Reset DB (⚠️ destroys all data)
python scripts/reset_db.py

# Re-seed data
python seed_data.py
```

### Frontend

```bash
npm run dev       # dev server (port 3000)
npm run build     # production build → dist/
npm run lint      # ESLint
npm test          # Vitest
```

### Docker (from repo root)

```bash
docker compose up -d          # start all services
docker compose down           # stop all services
docker compose logs -f backend
docker compose exec backend bash
```

### Docker (Makefile — run from Code Base Backend/)

```bash
make up / down / logs / shell / migrate / test
```

---

## API Design

- **Base URL:** `/api/v1`
- **Auth:** `Authorization: Bearer <JWT>` on all protected routes
- **Response envelope:** `{ success, data, error, code }`

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login → JWT |
| GET | `/api/v1/patients` | List patients |
| POST | `/api/v1/patients/{id}/triage` | AI triage |
| GET | `/api/v1/dashboard/stats` | Dashboard stats |
| GET | `/api/v1/beds` | All beds |
| GET | `/api/v1/alerts/active` | Active alerts |
| GET | `/api/v1/departments` | Departments |
| POST | `/api/v1/admin/staff` | Create staff (admin) |

Full reference: [Code Base Frontend/API_ENDPOINTS.md](Code Base Frontend/API_ENDPOINTS.md)

---

## Architecture Notes

### Multi-tenancy
Every entity (`Patient`, `User`, `Bed`, etc.) has a `tenant_id` FK on the `tenants` table. RLS is applied via `set_tenant_context()` in `app/db/database.py`.

### AI Triage
- Route: `POST /api/v1/patients/{id}/triage`
- Service: `app/services/triage.py` → Groq API (`llama-3.3-70b-versatile`)
- Assigns: **Immediate / Urgent / Less Urgent / Non-Urgent**

### Auth Flow
1. `POST /auth/login` → `access_token` (60 min JWT) + `refresh_token` (7 days)
2. Frontend stores token in `localStorage` (key: `authToken`)
3. Axios interceptor injects `Authorization: Bearer <token>`
4. 401 → auto-redirect to `/login` (except auth routes)

### Background Jobs
- Backend selected by `JOBS_BACKEND` env var: `sqs` (production), `trigger` (legacy), or `mock` (default — logs to stdout, app runs without it).
- **SQS** path (production): `app/services/sqs_jobs.py` enqueues to `er-cmd-jobs-queue`. The Lambda function `er-cmd-jobs-processor` (source: [`Code Base Backend/lambda/jobs_processor.py`](Code Base Backend/lambda/jobs_processor.py)) consumes messages and dispatches by `job_type` (email via Resend, alerts, cleanup, etc.).
- **Mock** path: `app/services/jobs.py` `TriggerDevService` logs messages — used in local dev when AWS credentials aren't set.

### DB Connection Notes
- `statement_cache_size=0` required for Supabase transaction pooler (port 6543)
- Alembic uses sync `DATABASE_SYNC_URL` (psycopg2); app uses async `DATABASE_URL` (asyncpg)

---

## Deployment (AWS)

**Region:** `ap-south-1` &nbsp;&nbsp; **Account:** `721995408359` &nbsp;&nbsp; **Prefix:** `er-cmd`

| Tier      | AWS Resource                                                                 |
|-----------|------------------------------------------------------------------------------|
| Frontend  | S3 bucket `er-cmd-frontend-721995408359` served by CloudFront `E1UU36HEM7C408` (`d2u6nlqdsggd1x.cloudfront.net`) |
| Backend   | Lambda `er-cmd-backend` (container image from ECR `er-backend:lambda`) fronted by API Gateway `o1567kly2d` |
| Routing   | CloudFront proxies `/api/*`, `/docs*`, `/openapi.json` → API Gateway; everything else → S3 |
| DB        | RDS PostgreSQL `er-cmd-db` (in private subnets `subnet-0a3b32b25cff8af46`, `subnet-0db3f22f041ce53d8`) |
| Jobs      | SQS `er-cmd-jobs-queue` → Lambda `er-cmd-jobs-processor` (source: [`Code Base Backend/lambda/jobs_processor.py`](Code Base Backend/lambda/jobs_processor.py)) |
| Uploads   | S3 `er-cmd-uploads-721995408359` |
| Secrets   | SSM Parameter Store under `/er-cmd/*` |

**Deploying changes:**

```bash
./aws-deploy.sh                  # build + push backend image, update Lambda, build frontend, sync S3, invalidate CloudFront
./aws-deploy.sh backend          # backend only
./aws-deploy.sh frontend         # frontend only
```

The script reads tracked resource IDs from [`aws-deploy-state.env`](aws-deploy-state.env) (gitignored — keep secrets out of the repo). To wipe the environment, run [`./aws-teardown.sh`](aws-teardown.sh).

Since the frontend and backend are served from the same CloudFront origin, `VITE_API_BASE_URL` is the relative path `/api/v1` (no CORS preflight needed).

---

## Demo Credentials

| Role   | Email                    | Password  |
|--------|--------------------------|-----------|
| Nurse  | priya@hospital.com       | nurse123  |
| Doctor | ananya@hospital.com      | doctor123 |
| Admin  | rajesh@hospital.com      | admin123  |

---

## Code Conventions

### Backend
- **Models** → `app/models/` — one file per domain entity
- **Schemas** → `app/schemas/` — separate `Create` / `Update` / `Response` per entity
- **Routes** → `app/api/routes/` — one file per domain, keep them thin
- **Services** → `app/services/` — all business logic lives here
- **Config** → always via `app/core/config.py` settings — never hardcode credentials
- **DB session** → inject via `get_db` dependency from `app/core/dependencies.py`

### Frontend
- **API calls** → only via `src/lib/api.ts` endpoints object
- **Data fetching** → custom hooks in `src/hooks/` wrapping TanStack Query
- **Shared types** → `src/data/types.ts`
- **Styling** → Tailwind + `cn()` from `src/lib/utils.ts`
- **UI components** → shadcn/ui primitives in `src/components/ui/`

---

## Known Gotchas

- `venv/` is at the repo root but gitignored — ideally put it inside `Code Base Backend/`
- `dist/` inside `Code Base Frontend/` is a local build artefact — gitignored, do not commit
- `TRIGGER_API_KEY` blank = mock mode; no need for Trigger.dev to run the core app
