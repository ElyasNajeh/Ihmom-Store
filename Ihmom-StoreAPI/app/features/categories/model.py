from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    ForeignKey,
    Index,
    String,
    false,
    text,
    true,
)
from sqlalchemy.orm import relationship

from app.constants.categories import CATEGORY_NAME_MAX_LENGTH
from app.constants.images import IMAGE_PATH_MAX_LENGTH
from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin


class Category(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "categories"

    name_ar = Column(
        String(CATEGORY_NAME_MAX_LENGTH),
        nullable=False,
        unique=True,
    )
    name_en = Column(
        String(CATEGORY_NAME_MAX_LENGTH),
        nullable=False,
        unique=True,
    )
    is_active = Column(
        Boolean,
        default=True,
        server_default=true(),
        nullable=False,
    )

    products = relationship("Product", back_populates="category")
    images = relationship(
        "CategoryImage",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="CategoryImage.id",
    )


class CategoryImage(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "category_images"
    __table_args__ = (
        Index(
            "uq_category_images_primary_per_category",
            "category_id",
            unique=True,
            postgresql_where=text("is_primary = true"),
        ),
    )

    category_id = Column(
        BigInteger,
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
    )
    image = Column(String(IMAGE_PATH_MAX_LENGTH), nullable=False)
    is_primary = Column(
        Boolean,
        default=False,
        server_default=false(),
        nullable=False,
    )

    category = relationship("Category", back_populates="images")
