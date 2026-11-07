from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Numeric,
    String,
    true,
)
from sqlalchemy.orm import relationship

from app.constants.common import MONEY_DECIMAL_PLACES, MONEY_MAX_DIGITS
from app.constants.delivery_areas import DELIVERY_AREA_NAME_MAX_LENGTH
from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin


class DeliveryArea(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "delivery_areas"
    __table_args__ = (
        CheckConstraint(
            "delivery_fee >= 0",
            name="ck_delivery_areas_delivery_fee_nonnegative",
        ),
    )

    name_ar = Column(
        String(DELIVERY_AREA_NAME_MAX_LENGTH),
        nullable=False,
        unique=True,
    )
    name_en = Column(
        String(DELIVERY_AREA_NAME_MAX_LENGTH),
        nullable=False,
        unique=True,
    )
    delivery_fee = Column(
        Numeric(MONEY_MAX_DIGITS, MONEY_DECIMAL_PLACES),
        nullable=False,
    )
    is_active = Column(
        Boolean,
        default=True,
        server_default=true(),
        nullable=False,
    )
    orders = relationship("Order", back_populates="delivery_area")
