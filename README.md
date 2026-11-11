# Ihmom Store

Ihmom Store is a bilingual e-commerce application with a React/TypeScript storefront and admin dashboard, a FastAPI backend, PostgreSQL 17, Redis, and Nginx. Customers browse active products, choose variants, maintain a cart, and place cash-on-delivery orders. Guest order lookup uses a phone number and order number; the admin dashboard manages the catalog, delivery, customers, orders, invoices, and statistics.

## Team

- Backend: [Elyas Najeh](https://github.com/ElyasNajeh)
- Frontend: [Amjad Qaher](https://github.com/Amjad-Adi)

## Repository layout

```text
Ihmom-Store/
|-- Ihmom-StoreAPI/
|   |-- app/                  # Production backend and admin bootstrap
|   |-- alembic/              # Committed schema migrations
|   |-- tests/                # Permanent unit/API/integration/migration tests
|   |-- Dockerfile            # Development
|   |-- Dockerfile.prod       # Production
|   |-- requirements.txt
|   `-- requirements-dev.txt
|-- Ihmom-StoreUI/
|   |-- src/
|   |-- public/               # Live storefront assets
|   |-- tests/                # Permanent unit/DOM/browser tests
|   |-- Dockerfile
|   |-- Dockerfile.prod
|   `-- nginx.conf
|-- docker-compose.yml        # Standalone development configuration
|-- docker-compose.prod.yml   # Standalone production configuration
`-- .env.example              # Safe environment template
```

The frontend owns its npm manifest and lockfile in `Ihmom-StoreUI/`.
Run npm commands from that directory. There is no root npm package.
Catalog data is managed through the admin dashboard; seed utilities have been
retired. Removing those utilities does not modify existing catalog records.

## Development

Create the root configuration only if it does not already exist:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Configure the required environment values privately, then start the development
stack from the repository root:

```bash
docker compose up -d --build
```

| Service | Development endpoint | Purpose |
|---|---|---|
| ui | http://localhost:5173 | Vite storefront/dashboard |
| api | http://localhost:8000 | FastAPI |
| postgres | localhost:5432 | Database |
| redis | Internal Docker network only | Login/checkout rate limiting |
| adminer | http://localhost:8080 | Database administration |

The API applies Alembic migrations before startup and requires healthy
PostgreSQL and Redis services. Uploaded media and database rows use the
existing `uploads_data` and `postgres_data` named volumes.

For a new database, create the initial administrator interactively:

```bash
docker compose exec api python -m app.db.create_admin
```

This operational bootstrap prompts for credentials; it is not a sample-data
loader. Subsequent catalog and account management uses the dashboard.

## Production deployment compatibility

The deployed working directory remains `/opt/ihmom-store`. Keep using:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Both Compose files remain standalone in the repository root. Production keeps
the `ihmom-store` project name, existing service/container names, environment
variables, ports, default network, and named volumes. The production file
intentionally differs from development: no source bind mounts or reload,
PostgreSQL is internal, published application/admin ports bind to loopback,
and the frontend is served by Nginx.

A shared Compose base was not introduced: it would add a deployment dependency
to the established single-file invocation without materially simplifying these
two small configurations. No deployment command or VPS configuration change
is required by this cleanup.

Preserve the real root `.env`. Production supplies `VITE_API_URL` at frontend
build time; configure trusted origins and secure cookies for the deployed HTTPS
origin. Do not remove database or upload volumes during deployment.

## Testing and documentation

- [Backend setup](Ihmom-StoreAPI/README.md)
- [Backend tests and isolated services](Ihmom-StoreAPI/tests/README.md)
- [Frontend setup](Ihmom-StoreUI/README.md)
- [Frontend tests](Ihmom-StoreUI/tests/README.md)
- [Frontend audit history](Ihmom-StoreUI/FRONTEND_TEST_REPORT.md)
- [Repository cleanup results](CLEANUP_REPORT.md)

FastAPI serves the current API contract at `/docs`, `/redoc`, and
`/openapi.json`. Database/integration/browser tests must use the dedicated
disposable test setup, never the deployed application database.

## Safety

Real `.env` files, credentials, local caches, build outputs, and test artifacts
are ignored by Git. Docker build contexts exclude local configuration and test
artifacts. Commit only the safe `.env.example` template. Use Alembic for schema
changes, retain persistent uploads, and back up application data before
maintenance.
