# Ihmom Store

Ihmom Store is a full-stack e-commerce web application for selling hookahs, vaping products, incense burners, computer accessories, gaming products, and related items.

Customers can browse products, explore available variants, add items to their cart, and place orders without creating an account. The platform supports Cash on Delivery (COD), delivery fees based on the selected area, and order history lookup using a phone number.

The project also includes an admin dashboard for managing store content, products, customers, delivery areas, orders, and business statistics.

## Team Members

- **Backend Developer:** [Elyas Najeh](https://github.com/ElyasNajeh).
- **Frontend Developer:** [Amjad Qaher](https://github.com/Amjad-Adi).

## Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic
- JWT Authentication
- Pillow (image processing)

### Database
- PostgreSQL 17

### Infrastructure
- Docker
- Docker Compose
- Adminer
- Nginx (production frontend)

## Main Features

### Customer Website
- Browse products by category and brand
- Arabic and English product information
- Product variants and pricing
- Product images
- Product search and filtering
- Shopping cart
- Guest checkout without registration or login
- Cash on Delivery (COD)
- Delivery areas with configurable delivery fees
- Order history lookup using a phone number
- Responsive user interface

### Admin Dashboard
- Secure admin authentication
- Admin account management
- Manage sliders, categories, and brands
- Manage products, variants, and images
- Manage customers
- Manage delivery areas and delivery fees
- View and manage customer orders
- Update order statuses
- Generate order invoices as PDF
- View dashboard statistics and order summaries
- Filter, search, sort, and paginate records

### Order Management

Orders follow these statuses:

1. `pending`
2. `confirmed`
3. `out_for_delivery`
4. `delivered`
5. `cancelled`

The backend validates allowed status transitions and calculates order totals using product prices and delivery fees stored in the database.

## Project Structure

```text
Ihmom-Store/
├── Ihmom-StoreAPI/          # FastAPI backend
│   ├── app/                 # Application source code
│   ├── alembic/             # Database migrations
│   ├── alembic.ini          # Alembic configuration
│   ├── docs/                # Backend and API documentation
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── requirements.txt
├── Ihmom-StoreUI/           # React / TypeScript frontend
│   ├── src/
│   ├── Dockerfile
│   └── Dockerfile.prod
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

## Docker Services

The development environment runs four Docker services:

| Service | Port | Purpose |
|---|---|---|
| `ui` | 5173 | React / Vite frontend |
| `api` | 8000 | FastAPI backend |
| `postgres` | 5432 | PostgreSQL database |
| `adminer` | 8080 | Database administration |

PostgreSQL data and uploaded images are stored in persistent Docker volumes.

## Development Setup

### 1. Configure Environment Variables

Create a `.env` file from `.env.example` in the project root.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update the required database, authentication, and application configuration values.

### 2. Build and Start the Project

From the project root, run:

```bash
docker compose up -d --build
```

Docker Compose starts PostgreSQL, Adminer, FastAPI, and the React development server.

The API automatically applies pending Alembic migrations before starting FastAPI.

### 3. Create the Initial Admin

For a new database, create the first administrator using:

```bash
docker compose exec api python -m app.db.create_admin
```

Follow the terminal prompts to configure the admin credentials.

Do not use hardcoded or shared demo passwords.

### 4. Access the Application

| Service | Local URL |
|---|---|
| React Frontend | http://localhost:5173 |
| Admin Login | http://localhost:5173/admin/login |
| FastAPI | http://localhost:8000 |
| Swagger API Docs | http://localhost:8000/docs |
| Adminer | http://localhost:8080 |

The frontend routes depend on the implemented React application.

## Database Migrations

The project uses Alembic to manage PostgreSQL schema changes.

Migrations are automatically applied when the API container starts.

To check the current migration revision:

```bash
docker compose exec api python -m alembic current
```

Database schema changes should be managed through Alembic rather than directly modifying production tables.

## Adminer

Open:

http://localhost:8080

Use the following connection information:

| Field | Value |
|---|---|
| System | PostgreSQL |
| Server | `postgres` |
| Username | `DATABASE_USER` from `.env` |
| Password | `DATABASE_PASSWORD` from `.env` |
| Database | `DATABASE_NAME` from `.env` |

Adminer runs inside the Docker network, so use `postgres` as the server hostname instead of `localhost`.

## Useful Docker Commands

Start all services:

```bash
docker compose up -d --build
```

View running services:

```bash
docker compose ps
```

View API logs:

```bash
docker compose logs -f api
```

Stop the project:

```bash
docker compose down
```

## Backend Documentation

Detailed backend documentation is available in `Ihmom-StoreAPI/docs/`.

| Document | Description |
|---|---|
| [Backend README](Ihmom-StoreAPI/README.md) | Backend setup and development instructions |
| [Backend Architecture](Ihmom-StoreAPI/docs/BACKEND_ARCHITECTURE.md) | Modules, database relationships, authentication, transactions, and application architecture |
| [API Reference](Ihmom-StoreAPI/docs/API_REFERENCE.md) | API endpoints, validation rules, request and response formats, and HTTP status codes |
| [Frontend Integration Guide](Ihmom-StoreAPI/docs/FRONTEND_INTEGRATION.md) | React/TypeScript integration, authentication, API errors, pagination, and request examples |

Interactive API documentation is also available through Swagger at:

http://localhost:8000/docs

## Environment and Data Persistence

Environment variables are configured through the root `.env` file.

The project uses Docker volumes for:

- `postgres_data` — PostgreSQL database files
- `uploads_data` — Uploaded product and slider images

Rebuilding or restarting containers does not normally remove these volumes.

Always back up production data before performing destructive operations or major database changes.
