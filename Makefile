.PHONY: dev-build dev-up dev-down dev-logs prod-build prod-up prod-down prod-logs status

dev-build:
	docker compose build

dev-up:
	docker compose up

dev-down:
	docker compose down

dev-logs:
	docker compose logs -f

prod-build:
	docker compose -f docker-compose.yml build

prod-up:
	docker compose -f docker-compose.yml up -d --wait

prod-down:
	docker compose -f docker-compose.yml down

prod-logs:
	docker compose -f docker-compose.yml logs -f

status:
	docker compose ps