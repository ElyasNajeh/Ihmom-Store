from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String, true

from app.db.base import Base


class Slider(Base):
    __tablename__ = "sliders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    title_ar = Column(
        String(200),
        nullable=False,
    )

    title_en = Column(
        String(200),
        nullable=False,
    )

    display_order = Column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    is_active = Column(
        Boolean,
        default=True,
        server_default=true(),
        nullable=False,
    )

    image = Column(
        String(500),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
