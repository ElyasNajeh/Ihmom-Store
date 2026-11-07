from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import settings
from app.db.base import Base

# Import all models to register their tables in Base.metadata.
from app.db import rate_limit as rate_limit_model
from app.features.admins import model as admins_model
from app.features.brands import model as brands_model
from app.features.categories import model as categories_model
from app.features.customers import model as customers_model
from app.features.delivery_areas import model as delivery_areas_model
from app.features.orders import model as orders_model
from app.features.products import model as products_model
from app.features.sliders import model as sliders_model

_REGISTERED_MODELS = (
    rate_limit_model,
    admins_model,
    brands_model,
    categories_model,
    customers_model,
    delivery_areas_model,
    orders_model,
    products_model,
    sliders_model,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
    )

    try:
        with engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
