from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Numeric,
    String,
    true,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class DeliveryArea(Base):
    __tablename__ = "delivery_areas"
    __table_args__ = (
        CheckConstraint(
            "delivery_fee >= 0",
            name="ck_delivery_areas_delivery_fee_nonnegative",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name_ar = Column(String(150), nullable=False, unique=True)
    name_en = Column(String(150), nullable=False, unique=True)
    delivery_fee = Column(Numeric(10, 2), nullable=False)
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
    orders = relationship("Order", back_populates="delivery_area")
