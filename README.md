# Ihmom Store

Ihmom Store is a bilingual e-commerce application with a React/TypeScript storefront and admin interface, a FastAPI backend, and PostgreSQL persistence. Customers can browse the catalog and place cash-on-delivery orders without creating an account; authenticated administrators manage the catalog, delivery areas, orders, sliders, customers, and dashboard.

## Repository layout

```text
Ihmom-Store/
├── Ihmom-StoreAPI/       # FastAPI, SQLAlchemy, Alembic
├── Ihmom-StoreUI/        # React, TypeScript, Vite
├── docker-compose.yml    # Development stack
├── docker-compose.prod.yml
└── .env.example
```

Backend setup, architecture, API contracts, and frontend integration are documented in [Ihmom-StoreAPI/README.md](Ihmom-StoreAPI/README.md) and [Ihmom-StoreAPI/docs](Ihmom-StoreAPI/docs).

## Development with Docker

1. Copy `.env.example` to `.env` and replace every placeholder, especially `DATABASE_PASSWORD` and `SECRET_KEY`.
2. Start the stack:

   ```bash
   docker compose up -d --build
   ```

3. Create the first administrator interactively:

   ```bash
   docker compose exec api python -m app.db.create_admin
   ```

The API waits for PostgreSQL, applies `alembic upgrade head`, and then starts with hot reload. Uploaded images and PostgreSQL data use named volumes. Do not use `docker compose down -v` unless deleting both stores is intentional.

| Service | Development URL |
| --- | --- |
| Store/admin UI | `http://localhost:5173` |
| API | `http://localhost:8000` |
| Swagger UI | `http://localhost:8000/docs` |
| OpenAPI JSON | `http://localhost:8000/openapi.json` |
| Adminer | `http://localhost:8080` |

Stop services without deleting data using `docker compose down`.

## Production overview

Use `docker compose -f docker-compose.prod.yml up -d --build` behind an HTTPS reverse proxy. Set the public `VITE_API_URL`, exact HTTPS `CORS_ORIGINS`, `COOKIE_SECURE=true`, and production-only database/JWT secrets. The production API image applies migrations before startup and runs Uvicorn without `--reload`. Adminer and application ports bind to loopback in the supplied production Compose file and should not be exposed directly to the internet.

No administrator credentials or demo data are bundled. Bootstrap the first administrator with the interactive command above.
