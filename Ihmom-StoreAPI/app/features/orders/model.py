from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.orm import relationship

from app.constants.common import MONEY_DECIMAL_PLACES, MONEY_MAX_DIGITS
from app.constants.orders import (
    ORDER_CUSTOMER_NAME_MAX_LENGTH,
    ORDER_CUSTOMER_PHONE_MAX_LENGTH,
    ORDER_INITIAL_STATUS,
    ORDER_NUMBER_MAX_LENGTH,
    ORDER_STATUS_CHECK_SQL,
    ORDER_STATUS_COLUMN_LENGTH,
)
from app.constants.products import DEFAULT_VARIANT_NAME
from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin


class Order(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            ORDER_STATUS_CHECK_SQL,
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

    order_number = Column(
        String(ORDER_NUMBER_MAX_LENGTH),
        nullable=False,
        unique=True,
    )
    customer_id = Column(
        BigInteger,
        ForeignKey("customers.id"),
        nullable=False,
    )
    customer_name = Column(
        String(ORDER_CUSTOMER_NAME_MAX_LENGTH),
        nullable=False,
    )
    customer_phone = Column(
        String(ORDER_CUSTOMER_PHONE_MAX_LENGTH),
        nullable=False,
    )
    delivery_area_id = Column(
        BigInteger,
        ForeignKey("delivery_areas.id"),
        nullable=False,
    )
    address = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    subtotal = Column(
        Numeric(MONEY_MAX_DIGITS, MONEY_DECIMAL_PLACES),
        nullable=False,
    )
    delivery_fee = Column(
        Numeric(MONEY_MAX_DIGITS, MONEY_DECIMAL_PLACES),
        default=0,
        server_default=text("0"),
        nullable=False,
    )
    total = Column(
        Numeric(MONEY_MAX_DIGITS, MONEY_DECIMAL_PLACES),
        nullable=False,
    )
    status = Column(
        String(ORDER_STATUS_COLUMN_LENGTH),
        default=ORDER_INITIAL_STATUS,
        server_default=ORDER_INITIAL_STATUS,
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


class OrderItem(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        CheckConstraint(
            "unit_price >= 0",
            name="ck_order_items_unit_price_nonnegative",
        ),
        CheckConstraint("total >= 0", name="ck_order_items_total_nonnegative"),
    )

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
    unit_price = Column(
        Numeric(MONEY_MAX_DIGITS, MONEY_DECIMAL_PLACES),
        nullable=False,
    )
    total = Column(
        Numeric(MONEY_MAX_DIGITS, MONEY_DECIMAL_PLACES),
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
            self.product_variant.name_ar == DEFAULT_VARIANT_NAME
            and self.product_variant.name_en == DEFAULT_VARIANT_NAME
        )
