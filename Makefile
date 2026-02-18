VENV_BIN := $(CURDIR)/venv/bin
NODE22_BIN := /opt/homebrew/opt/node@22/bin
NODE_PATH_PREFIX := $(if $(wildcard $(NODE22_BIN)/node),$(NODE22_BIN):,)

.PHONY: dev api worker frontend test lint format clean docker-up docker-down

# Development
dev:
	@echo "Starting API, Worker, and Frontend..."
	@make -j3 api worker frontend

api:
	$(VENV_BIN)/python3 -m uvicorn api.main:app --reload --reload-dir api --reload-include "*.py" --reload-exclude "venv*" --reload-exclude "venv_py313_backup_*" --reload-exclude "frontend/*" --reload-exclude "data/*" --reload-exclude "logs/*" --reload-exclude ".git/*"

worker:
	$(VENV_BIN)/python3 worker.py

frontend:
	cd frontend && NEXT_TELEMETRY_DISABLED=1 PATH="$(NODE_PATH_PREFIX)$$PATH" npm run dev -- --hostname 127.0.0.1 --port 3000

# Testing
test:
	PYTHONPATH=. pytest tests/ -v --tb=short

test-cov:
	PYTHONPATH=. pytest tests/ -v --cov=api --cov=. --cov-report=term-missing

# Code Quality
lint:
	ruff check .

format:
	ruff format .

fix:
	ruff check --fix .

# Docker
docker-up:
	docker-compose up --build

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Database
db-reset:
	rm -f data/leadpilot.db
	python -c "from api.database import init_db; init_db()"

# Cleanup
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true

# Help
help:
	@echo "Available commands:"
	@echo "  make dev         - Start API, Worker, and Frontend concurrently"
	@echo "  make api         - Start API server only"
	@echo "  make worker      - Start background worker only"
	@echo "  make frontend    - Start Frontend only"
	@echo "  make test        - Run pytest tests"
	@echo "  make lint        - Run ruff linter"
	@echo "  make format      - Format code with ruff"
	@echo "  make docker-up   - Start with Docker Compose"
	@echo "  make docker-down - Stop Docker containers"
	@echo "  make clean       - Remove cache files"
