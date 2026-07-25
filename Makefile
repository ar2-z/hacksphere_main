.PHONY: help install dev test lint format run migrate seed docker-up docker-down docker-logs backup restore

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pip install -e ".[dev]"

dev: ## Start development server
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug

test: ## Run tests
	pytest tests/ -v --cov=app --cov-report=html

test-unit: ## Run unit tests only
	pytest tests/ -v -m unit

test-integration: ## Run integration tests only
	pytest tests/ -v -m integration

lint: ## Run linting
	ruff check app/ tests/
	mypy app/

format: ## Format code
	ruff format app/ tests/
	ruff check --fix app/ tests/

migrate: ## Run database migrations
	alembic upgrade head

migrate-create: ## Create new migration
	alembic revision --autogenerate -m "$(msg)"

seed: ## Seed database with test data
	python -m app.tasks.seed

run: ## Run the application
	uvicorn app.main:app --host 0.0.0.0 --port 8000

docker-up: ## Start all services with Docker
	docker-compose up -d

docker-down: ## Stop all services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-build: ## Build Docker images
	docker-compose build

backup: ## Backup database
	./scripts/backup.sh backup

restore: ## Restore database from backup
	./scripts/backup.sh restore $(file)

monitor: ## Run monitoring checks
	./scripts/monitor.sh check

deploy: ## Deploy to production
	./scripts/deploy.sh deploy

clean: ## Clean up temporary files
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache htmlcov .coverage

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

psql: ## Open PostgreSQL CLI
	docker-compose exec postgres psql -U hacksphere -d hacksphere
