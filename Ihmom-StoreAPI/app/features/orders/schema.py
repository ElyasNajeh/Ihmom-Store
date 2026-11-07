
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.constants.common import (
    MAX_INT32,
    MONEY_DECIMAL_PLACES,
    MONEY_MAX_DIGITS,
)
from app.constants.orders import (
    ORDER_CUSTOMER_NAME_MAX_LENGTH,
    ORDER_CUSTOMER_PHONE_MAX_LENGTH,
    ORDER_NUMBER_MAX_LENGTH,
    ORDER_QUANTITY_MIN,
    ORDER_SEARCH_MAX_LENGTH,
    OrderStatus,
)
from app.constants.query import (
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_NUMBER,
    MAX_PAGE_SIZE,
)
from app.shared.phone import PhoneNumber
from app.shared.schema import FilterBase, PageResponse, QueryBase


PositiveId = Annotated[StrictInt, Field(ge=1)]
OrderQuantity = Annotated[
    StrictInt,
    Field(ge=ORDER_QUANTITY_MIN, le=MAX_INT32),
]


class OrderSortBy(str, Enum):
    ID = "id"
    CREATED_AT = "created_at"
    TOTAL = "total"
    CUSTOMER_NAME = "customer_name"
    STATUS = "status"


class CheckoutItem(BaseModel):
    product_variant_id: PositiveId
    quantity: OrderQuantity

    model_config = ConfigDict(extra="forbid")


class CheckoutRequest(BaseModel):
    customer_name: str = Field(
        min_length=1,
        max_length=ORDER_CUSTOMER_NAME_MAX_LENGTH,
    )
    customer_phone: PhoneNumber = Field(
        max_length=ORDER_CUSTOMER_PHONE_MAX_LENGTH,
    )
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


class OrderHistoryVerifyRequest(BaseModel):
    phone: PhoneNumber = Field(max_length=ORDER_CUSTOMER_PHONE_MAX_LENGTH)
    order_number: str = Field(
        min_length=1,
        max_length=ORDER_NUMBER_MAX_LENGTH,
    )

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("order_number", mode="before")
    @classmethod
    def normalize_order_number(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip().removeprefix("#").strip()
        return value


class OrderHistoryTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int


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
    history_access_token: str
    history_access_token_expires_in: int


class OrderHistoryItemResponse(BaseModel):
    order_number: str
    status: OrderStatus
    created_at: datetime
    customer_name: str
    customer_phone: str
    delivery_area_name_ar: str
    delivery_area_name_en: str
    address: str
    notes: str | None
    total_quantity: int
    items: list[PublicOrderItemResponse]
    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderFilter(FilterBase):
    status: OrderStatus | None = None
    delivery_area_id: int | None = Field(default=None, ge=1)
    date_from: date | None = None
    date_to: date | None = None
    min_total: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
    )
    max_total: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
    )

    @model_validator(mode="after")
    def validate_ranges(self):
        if (
            self.date_from is not None
            and self.date_to is not None
            and self.date_from > self.date_to
        ):
            raise ValueError("date_from must not be after date_to")

        if (
            self.min_total is not None
            and self.max_total is not None
            and self.min_total > self.max_total
        ):
            raise ValueError("min_total must not exceed max_total")

        return self


class OrderQuery(QueryBase):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    page: int = Field(default=DEFAULT_PAGE, ge=1, le=MAX_PAGE_NUMBER)
    page_size: int = Field(
        default=DEFAULT_PAGE_SIZE,
        ge=1,
        le=MAX_PAGE_SIZE,
    )
    search: Annotated[
        str | None,
        StringConstraints(
            strip_whitespace=True,
            min_length=1,
            max_length=ORDER_SEARCH_MAX_LENGTH,
        ),
    ] = None
    filter: OrderFilter | None = None
    sort_by: OrderSortBy | None = None

    @field_validator("search")
    @classmethod
    def normalize_search(cls, value: str | None) -> str | None:
        return value or None


# Keep the old name available for any remaining imports.
OrderFilters = OrderFilter

OrderListResponse = PageResponse[OrderResponse]
