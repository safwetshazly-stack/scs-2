.PHONY: help dev prod stop logs clean seed migrate

help:
	@echo "SCS Platform — Available Commands"
	@echo ""
	@echo "  make dev          — Start development environment"
	@echo "  make prod         — Start production environment"
	@echo "  make stop         — Stop all containers"
	@echo "  make logs         — View backend logs"
	@echo "  make migrate      — Run database migrations"
	@echo "  make seed         — Seed demo data"
	@echo "  make clean        — Remove containers + volumes"
	@echo "  make backend-sh   — Shell into backend container"
	@echo "  make db-studio    — Open Prisma Studio"

dev:
	docker compose -f docker-compose.dev.yml up -d
	@echo "✅ Dev environment started"
	@echo "   Frontend:  http://localhost:3000"
	@echo "   Backend:   http://localhost:4000"
	@echo "   DB:        localhost:5432"

prod:
	docker compose up -d --build
	@echo "✅ Production environment started"

stop:
	docker compose down
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose logs -f backend

migrate:
	docker compose exec backend npx prisma migrate deploy

seed:
	docker compose exec backend npm run prisma:seed

clean:
	docker compose down -v --remove-orphans
	docker compose -f docker-compose.dev.yml down -v --remove-orphans
	docker image prune -f

backend-sh:
	docker compose exec backend sh

db-studio:
	cd backend && npx prisma studio
