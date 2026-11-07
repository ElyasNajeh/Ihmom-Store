from sqlalchemy import Boolean, Column, String, true
from sqlalchemy.orm import relationship

from app.constants.brands import BRAND_NAME_MAX_LENGTH
from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin


class Brand(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "brands"

    name_ar = Column(
        String(BRAND_NAME_MAX_LENGTH),
        nullable=False,
        unique=True,
    )
    name_en = Column(
        String(BRAND_NAME_MAX_LENGTH),
        nullable=False,
        unique=True,
    )
    is_active = Column(
        Boolean,
        default=True,
        server_default=true(),
        nullable=False,
    )

    products = relationship("Product", back_populates="brand")
