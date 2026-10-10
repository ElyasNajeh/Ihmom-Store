from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    field_validator,
    model_validator,
)

from app.shared.phone import PhoneNumber


OrderStatus = Literal[
    "pending",
    "confirmed",
    "out_for_delivery",
    "delivered",
    "cancelled",
]
OrderSort = Literal["id", "created_at", "total", "customer_name", "status"]
SortOrder = Literal["asc", "desc"]
PositiveId = Annotated[StrictInt, Field(ge=1)]
OrderQuantity = Annotated[StrictInt, Field(ge=1, le=2_147_483_647)]


class CheckoutItem(BaseModel):
    product_variant_id: PositiveId
    quantity: OrderQuantity

    model_config = ConfigDict(extra="forbid")


class CheckoutRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=150)
    customer_phone: PhoneNumber = Field(max_length=30)
    delivery_area_id: PositiveId
    address: str = Field(min_length=1)
    notes: str | None = None
    items: list[CheckoutItem] = Field(min_length=1)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("customer_name", "address", mode="before")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("notes", mode="before")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def unique_product_variants(self):
        variant_ids = [item.product_variant_id for item in self.items]
        if len(variant_ids) != len(set(variant_ids)):
            raise ValueError("Duplicate product variants are not allowed")
        return self


class OrderHistoryRequest(BaseModel):
    phone: PhoneNumber = Field(max_length=30)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class OrderStatusUpdate(BaseModel):
    status: OrderStatus

    model_config = ConfigDict(extra="forbid")


class OrderDeliveryAreaResponse(BaseModel):
    id: int
    name_ar: str
    name_en: str

    model_config = ConfigDict(from_attributes=True)


class OrderItemResponse(BaseModel):
    id: int
    product_variant_id: int
    product_name_ar: str
    product_name_en: str
    variant_name_ar: str | None
    variant_name_en: str | None
    quantity: int
    unit_price: Decimal
    total: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicOrderItemResponse(BaseModel):
    product_name_ar: str
    product_name_en: str
    variant_name_ar: str | None
    variant_name_en: str | None
    quantity: int
    unit_price: Decimal
    total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    customer_name: str
    customer_phone: str
    delivery_area_id: int
    delivery_area: OrderDeliveryAreaResponse
    address: str
    notes: str | None
    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal
    status: OrderStatus
    created_at: datetime
    items: list[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)


class CheckoutOrderResponse(BaseModel):
    order_number: str
    status: OrderStatus
    created_at: datetime
    customer_name: str
    delivery_area_name_ar: str
    delivery_area_name_en: str
    address: str
    items: list[PublicOrderItemResponse]
    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal


class OrderHistoryItemResponse(BaseModel):
    order_number: str
    status: OrderStatus
    created_at: datetime
    total_quantity: int
    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderFilters(BaseModel):
    status: OrderStatus | None = None
    delivery_area_id: int | None = Field(default=None, ge=1)
    date_from: date | None = None
    date_to: date | None = None
    min_total: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=2,
    )
    max_total: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=2,
    )

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("date_from must not be after date_to")
        if (
            self.min_total is not None
            and self.max_total is not None
            and self.min_total > self.max_total
        ):
            raise ValueError("min_total must not exceed max_total")
        return self
