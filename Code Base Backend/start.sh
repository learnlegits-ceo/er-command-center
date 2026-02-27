#!/bin/bash
set -e

echo "Running database migrations..."
# Hard-fail on migration error — prevents starting with corrupt/mismatched schema
alembic upgrade head

echo "Starting FastAPI server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
