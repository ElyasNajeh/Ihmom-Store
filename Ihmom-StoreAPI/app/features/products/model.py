from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    false,
    text,
    true,
)
from sqlalchemy.orm import relationship

from app.constants.common import MONEY_DECIMAL_PLACES, MONEY_MAX_DIGITS
from app.constants.images import IMAGE_PATH_MAX_LENGTH
from app.constants.products import (
    PRODUCT_NAME_MAX_LENGTH,
    PRODUCT_SKU_MAX_LENGTH,
    PRODUCT_VARIANT_NAME_MAX_LENGTH,
)
from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin


class Product(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "products"

    category_id = Column(
        BigInteger,
        ForeignKey("categories.id"),
        nullable=False,
    )
    brand_id = Column(
        BigInteger,
        ForeignKey("brands.id"),
        nullable=False,
    )
    name_ar = Column(String(PRODUCT_NAME_MAX_LENGTH), nullable=False)
    name_en = Column(String(PRODUCT_NAME_MAX_LENGTH), nullable=False)
    description_ar = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    is_active = Column(
        Boolean,
        default=True,
        server_default=true(),
        nullable=False,
    )

    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    variants = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.id",
    )
    images = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.id",
    )


class ProductVariant(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_product_variants_price_nonnegative"),
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    name_ar = Column(String(PRODUCT_VARIANT_NAME_MAX_LENGTH), nullable=False)
    name_en = Column(String(PRODUCT_VARIANT_NAME_MAX_LENGTH), nullable=False)
    sku = Column(String(PRODUCT_SKU_MAX_LENGTH), nullable=True, unique=True)
    price = Column(
        Numeric(MONEY_MAX_DIGITS, MONEY_DECIMAL_PLACES),
        nullable=False,
    )
    is_active = Column(
        Boolean,
        default=True,
        server_default=true(),
        nullable=False,
    )

    product = relationship("Product", back_populates="variants")
    order_items = relationship("OrderItem", back_populates="product_variant")


class ProductImage(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "product_images"
    __table_args__ = (
        Index(
            "uq_product_images_primary_per_product",
            "product_id",
            unique=True,
            postgresql_where=text("is_primary = true"),
        ),
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    image = Column(String(IMAGE_PATH_MAX_LENGTH), nullable=False)
    is_primary = Column(
        Boolean,
        default=False,
        server_default=false(),
        nullable=False,
    )

    product = relationship("Product", back_populates="images")
