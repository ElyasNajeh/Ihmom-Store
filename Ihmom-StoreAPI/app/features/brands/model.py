from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, String, true
from sqlalchemy.orm import relationship

from app.db.base import Base


class Brand(Base):
    __tablename__ = "brands"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name_ar = Column(String(100), nullable=False, unique=True)
    name_en = Column(String(100), nullable=False, unique=True)
    is_active = Column(
        Boolean,
        default=True,
        server_default=true(),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    products = relationship("Product", back_populates="brand")
