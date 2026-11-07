from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BigIntIdMixin:
    id = Column(BigInteger, primary_key=True, autoincrement=True)


class CreatedAtMixin:
    created_at = Column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
