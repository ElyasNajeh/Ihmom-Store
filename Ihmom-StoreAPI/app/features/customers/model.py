from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.constants.customers import (
    CUSTOMER_NAME_MAX_LENGTH,
    CUSTOMER_PHONE_MAX_LENGTH,
)
from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin


class Customer(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "customers"

    name = Column(String(CUSTOMER_NAME_MAX_LENGTH), nullable=False)
    phone = Column(
        String(CUSTOMER_PHONE_MAX_LENGTH),
        nullable=False,
        unique=True,
    )

    orders = relationship("Order", back_populates="customer")
