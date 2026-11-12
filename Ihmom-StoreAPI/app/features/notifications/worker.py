"""Run with python -m app.features.notifications.worker (no API process tasks)."""

import asyncio
import logging
import signal

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.mixins import utcnow
from app.features.notifications.bird import BirdClient, BirdResult
from app.features.notifications.config import bird_config
from app.features.notifications.service import claim_next, finish_claim

# Register the order/catalog relationships in this standalone process, following
# the existing Alembic entrypoint's explicit model-import convention.
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.customers.model import Customer
from app.features.delivery_areas.model import DeliveryArea
from app.features.products.model import Product, ProductVariant


_REGISTERED_MODELS = (Brand, Category, Customer, DeliveryArea, Product, ProductVariant)
logger = logging.getLogger(__name__)


def worker_database():
    # Worker-specific bounds: a database outage must not hang shutdown forever.
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        connect_args={
            "connect_timeout": 5,
            "options": "-c statement_timeout=10000 -c lock_timeout=3000",
        },
    )
    return engine, sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


def schema_ready(factory):
    """Wait for the API-owned additive migration; never run Alembic in workers."""
    try:
        with factory() as db:
            db.execute(
                text(
                    "SELECT id, lease_token, request_body FROM order_notifications LIMIT 0"
                )
            )
            db.execute(text("SELECT id, outcome FROM notification_attempts LIMIT 0"))
            db.execute(
                text("SELECT event_id, applied_at FROM bird_delivery_events LIMIT 0")
            )
        return True
    except Exception:
        return False


def _claim(factory, config):
    with factory() as db:
        return claim_next(db, config)


def _finish(factory, claim, result, config):
    with factory() as db:
        return finish_claim(db, claim, result, config)


async def process_one(factory, config, provider):
    claim = await asyncio.to_thread(_claim, factory, config)
    if claim is None:
        return False
    if claim.operation == "noop":
        return True
    if claim.operation == "send":
        if utcnow() >= claim.replay_deadline:
            result = BirdResult("uncertain", "idempotency_window_closed")
        else:
            result = await provider.send(claim.url, claim.body, claim.key)
    else:
        result = await provider.lookup(claim.url, claim.message_id)
    await asyncio.to_thread(_finish, factory, claim, result, config)
    return True


async def _wait(stop, seconds):
    try:
        await asyncio.wait_for(stop.wait(), timeout=seconds)
    except TimeoutError:
        pass


async def run_worker(stop, *, factory=None, transport=None):
    config, error = bird_config(settings)
    if config is None:
        # Never log actual settings, keys, recipient, response bodies or traces.
        logger.warning("notification_worker_paused code=%s", error)
        while not stop.is_set():
            await _wait(stop, 30)
        return
    engine = None
    if factory is None:
        engine, factory = worker_database()
    provider = BirdClient(config, transport=transport)
    try:
        while not stop.is_set():
            try:
                worked = await process_one(factory, config, provider)
            except Exception:
                # Claimed work remains durable; lease recovery uses the SAME
                # payload/key within retention. No exception details leak PII.
                logger.error("notification_worker_iteration_failed")
                worked = False
            if not worked:
                await _wait(stop, config.poll_seconds)
    finally:
        await provider.close()
        if engine is not None:
            engine.dispose()


async def main():
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:  # Windows local worker execution
            signal.signal(sig, lambda *_: loop.call_soon_threadsafe(stop.set))
    engine, factory = worker_database()
    try:
        while not stop.is_set():
            if await asyncio.to_thread(schema_ready, factory):
                await run_worker(stop, factory=factory)
                return
            logger.warning("notification_worker_waiting_for_schema")
            await _wait(stop, 5)
    finally:
        engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    # httpx normally logs requests including URLs. Our own diagnostics suffice.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    asyncio.run(main())
