.PHONY: help build up down restart logs shell db-shell test clean

help:
	@echo "ER Command Center - Docker Commands"
	@echo ""
	@echo "  make build       - Build Docker images"
	@echo "  make up          - Start all services"
	@echo "  make down        - Stop all services"
	@echo "  make restart     - Restart services"
	@echo "  make logs        - View backend logs"
	@echo "  make shell       - Access backend shell"
	@echo "  make db-shell    - Access PostgreSQL shell"
	@echo "  make migrate     - Run database migrations"
	@echo "  make test        - Run tests"
	@echo "  make clean       - Remove containers and volumes"
	@echo ""

build:
	docker compose build

up:
	docker compose up -d
	@echo ""
	@echo "Services started!"
	@echo "API: http://localhost:8000"
	@echo "Docs: http://localhost:8000/api/docs"

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f backend

logs-all:
	docker compose logs -f

shell:
	docker compose exec backend bash

db-shell:
	docker compose exec postgres psql -U postgres -d er_command_center

migrate:
	docker compose exec backend alembic upgrade head

test:
	docker compose exec backend pytest -v

test-cov:
	docker compose exec backend pytest --cov=app --cov-report=html

clean:
	docker compose down -v
	@echo "All containers and volumes removed!"

status:
	docker compose ps

health:
	@curl -s http://localhost:8000/health
