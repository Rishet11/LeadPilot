.PHONY: dev api frontend test lint format clean docker-up docker-down

# Development
dev:
	@echo "Starting API and Frontend..."
	@make -j2 api frontend

api:
	uvicorn api.main:app --reload

frontend:
	cd frontend && npm run dev

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
	@echo "  make dev         - Start API and Frontend concurrently"
	@echo "  make api         - Start API server only"
	@echo "  make frontend    - Start Frontend only"
	@echo "  make test        - Run pytest tests"
	@echo "  make lint        - Run ruff linter"
	@echo "  make format      - Format code with ruff"
	@echo "  make docker-up   - Start with Docker Compose"
	@echo "  make docker-down - Stop Docker containers"
	@echo "  make clean       - Remove cache files"
