import hashlib
import hmac
import secrets
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.constants.rate_limit import (
    CLEANUP_GRACE_SECONDS,
    CLEANUP_INTERVAL_SECONDS,
    CLEANUP_PROBABILITY,
)
from app.core.config import settings
from app.db.base import Base


_last_cleanup_at = 0.0


class RateLimitCounter(Base):
    __tablename__ = "rate_limit_counters"
    __table_args__ = (
        UniqueConstraint(
            "bucket_key",
            "window_start",
            name="uq_rate_limit_counters_bucket_window",
        ),
        Index("ix_rate_limit_counters_expires_at", "expires_at"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    bucket_key = Column(String(128), nullable=False)
    window_start = Column(DateTime(timezone=True), nullable=False)
    count = Column(Integer, nullable=False, server_default=text("0"))
    expires_at = Column(DateTime(timezone=True), nullable=False)


def _bucket_key(scope: str, subject: str) -> str:
    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        subject.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{scope}:{digest}"


def _increment(
    db: Session,
    key: str,
    window_start: datetime,
    expires_at: datetime,
) -> int:
    statement = (
        insert(RateLimitCounter)
        .values(
            bucket_key=key,
            window_start=window_start,
            count=1,
            expires_at=expires_at,
        )
        .on_conflict_do_update(
            constraint="uq_rate_limit_counters_bucket_window",
            set_={
                "count": RateLimitCounter.count + 1,
                "expires_at": expires_at,
            },
        )
        .returning(RateLimitCounter.count)
    )

    count = db.execute(statement).scalar_one()
    db.commit()
    return count


def _cleanup_if_due(db: Session, now: datetime) -> None:
    global _last_cleanup_at

    if secrets.randbelow(CLEANUP_PROBABILITY) != 0:
        return

    monotonic_now = time.monotonic()
    if monotonic_now - _last_cleanup_at < CLEANUP_INTERVAL_SECONDS:
        return

    _last_cleanup_at = monotonic_now
    cutoff = now - timedelta(seconds=CLEANUP_GRACE_SECONDS)
    db.query(RateLimitCounter).filter(
        RateLimitCounter.expires_at < cutoff
    ).delete(synchronize_session=False)
    db.commit()


def consume(
    db: Session,
    *,
    scope: str,
    subject: str,
    limit: int,
    window_seconds: int,
    now: datetime | None = None,
) -> int | None:
    """Count one attempt in a fixed window.

    Returns the number of seconds until the window resets when the limit is
    exceeded, otherwise ``None``. The subject is hashed before it is stored,
    so raw IP addresses and phone numbers never reach the database or logs.
    """
    current_time = now or datetime.now(timezone.utc)
    window_timestamp = (
        int(current_time.timestamp()) // window_seconds
    ) * window_seconds
    window_start = datetime.fromtimestamp(
        window_timestamp,
        tz=timezone.utc,
    )
    expires_at = window_start + timedelta(seconds=window_seconds)

    count = _increment(
        db,
        _bucket_key(scope, subject),
        window_start,
        expires_at,
    )
    _cleanup_if_due(db, current_time)

    if count <= limit:
        return None

    retry_after = int((expires_at - current_time).total_seconds())
    return max(1, retry_after)
