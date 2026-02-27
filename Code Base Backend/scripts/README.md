# Backend Scripts

Utility scripts for database management. Run all commands from the **backend root directory** (`Code Base Backend/`).

## Setup

```bash
# First-time full setup (creates DB, tables, seed data)
python setup_all.py
```

## Database Management

```bash
# Check DB connection, tables, and seed data
python scripts/check_db.py

# Reset DB (WARNING: destroys all data, recreates tables)
python scripts/reset_db.py
```

## Seed Data

```bash
# Seed via Python (recommended)
python seed_data.py

# Seed via raw SQL (alternative)
psql $DATABASE_SYNC_URL < scripts/seed_data.sql
```

## SQL Files

| File | Purpose |
|------|---------|
| `database_schema.sql` | Full schema DDL (used by Docker Compose dev init) |
| `seed_data.sql` | Raw SQL seed data (alternative to seed_data.py) |
| `add_department_patients.sql` | Additional patient records for all departments |

## Demo Credentials

| Role   | Email                    | Password   |
|--------|--------------------------|------------|
| Nurse  | priya@hospital.com       | nurse123   |
| Doctor | ananya@hospital.com      | doctor123  |
| Admin  | rajesh@hospital.com      | admin123   |
