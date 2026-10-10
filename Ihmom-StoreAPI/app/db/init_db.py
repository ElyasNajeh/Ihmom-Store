from sqlalchemy import URL, create_engine, text

from app.core.config import settings


def create_database_if_not_exists():
    server_url = URL.create(
        drivername="postgresql+psycopg2",
        username=settings.DATABASE_USER,
        password=settings.DATABASE_PASSWORD,
        host=settings.DATABASE_HOST,
        port=settings.DATABASE_PORT,
        database="postgres",
    )

    server_engine = create_engine(
        server_url,
        isolation_level="AUTOCOMMIT",
    )

    with server_engine.connect() as connection:
        result = connection.execute(
            text("SELECT 1 FROM pg_database " "WHERE datname = :db_name"),
            {"db_name": settings.DATABASE_NAME},
        )

        database_exists = result.scalar() is not None

        if not database_exists:
            database_name = connection.dialect.identifier_preparer.quote(
                settings.DATABASE_NAME
            )
            connection.execute(text(f"CREATE DATABASE {database_name}"))

    server_engine.dispose()


def init_db():
    create_database_if_not_exists()


if __name__ == "__main__":
    init_db()
