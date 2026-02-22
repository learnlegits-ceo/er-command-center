#!/bin/bash

echo "Running database migrations..."
alembic upgrade head || echo "Warning: Migration failed, tables will be created at startup"

echo "Starting FastAPI server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
