from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "status in ('pending', 'confirmed', 'out_for_delivery', "
            "'delivered', 'cancelled')",
            name="ck_orders_status_allowed",
        ),
        CheckConstraint("subtotal >= 0", name="ck_orders_subtotal_nonnegative"),
        CheckConstraint(
            "delivery_fee >= 0",
            name="ck_orders_delivery_fee_nonnegative",
        ),
        CheckConstraint("total >= 0", name="ck_orders_total_nonnegative"),
        Index("ix_orders_customer_phone", "customer_phone"),
        Index("ix_orders_status", "status"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, unique=True)
    customer_id = Column(
        BigInteger,
        ForeignKey("customers.id"),
        nullable=False,
    )
    customer_name = Column(String(150), nullable=False)
    customer_phone = Column(String(30), nullable=False)
    delivery_area_id = Column(
        BigInteger,
        ForeignKey("delivery_areas.id"),
        nullable=False,
    )
    address = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    subtotal = Column(Numeric(10, 2), nullable=False)
    delivery_fee = Column(
        Numeric(10, 2),
        default=0,
        server_default=text("0"),
        nullable=False,
    )
    total = Column(Numeric(10, 2), nullable=False)
    status = Column(
        String(30),
        default="pending",
        server_default="pending",
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    customer = relationship("Customer", back_populates="orders")
    delivery_area = relationship("DeliveryArea", back_populates="orders")
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderItem.id",
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        CheckConstraint(
            "unit_price >= 0",
            name="ck_order_items_unit_price_nonnegative",
        ),
        CheckConstraint("total >= 0", name="ck_order_items_total_nonnegative"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(
        BigInteger,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_variant_id = Column(
        BigInteger,
        ForeignKey("product_variants.id"),
        nullable=False,
    )
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    order = relationship("Order", back_populates="items")
    product_variant = relationship("ProductVariant", back_populates="order_items")

    @property
    def product_name_ar(self) -> str:
        return self.product_variant.product.name_ar

    @property
    def product_name_en(self) -> str:
        return self.product_variant.product.name_en

    @property
    def variant_name_ar(self) -> str | None:
        if self._is_default_variant:
            return None
        return self.product_variant.name_ar

    @property
    def variant_name_en(self) -> str | None:
        if self._is_default_variant:
            return None
        return self.product_variant.name_en

    @property
    def _is_default_variant(self) -> bool:
        return (
            self.product_variant.name_ar == "__default__"
            and self.product_variant.name_en == "__default__"
        )
