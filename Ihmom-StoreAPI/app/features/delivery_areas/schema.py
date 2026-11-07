
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated

from pydantic import (
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator, BaseModel,
)

from app.constants.common import MONEY_DECIMAL_PLACES, MONEY_MAX_DIGITS
from app.constants.delivery_areas import (
    DELIVERY_AREA_NAME_MAX_LENGTH,
    DELIVERY_AREA_SEARCH_MAX_LENGTH,
)
from app.constants.query import (
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_NUMBER,
    MAX_PAGE_SIZE,
)
from app.shared.schema import FilterBase, PageResponse, QueryBase


class DeliveryAreaBase(BaseModel):
    name_ar: str = Field(min_length=1, max_length=DELIVERY_AREA_NAME_MAX_LENGTH)
    name_en: str = Field(min_length=1, max_length=DELIVERY_AREA_NAME_MAX_LENGTH)
    delivery_fee: Decimal = Field(
        ge=0,
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
    )

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class DeliveryAreaCreate(DeliveryAreaBase):
    is_active: bool = True


class DeliveryAreaUpdate(BaseModel):
    name_ar: str | None = Field(
        default=None,
        min_length=1,
        max_length=DELIVERY_AREA_NAME_MAX_LENGTH,
    )
    name_en: str | None = Field(
        default=None,
        min_length=1,
        max_length=DELIVERY_AREA_NAME_MAX_LENGTH,
    )
    delivery_fee: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
    )
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Delivery area names cannot be null")
        return value.strip() if isinstance(value, str) else value

    @field_validator("delivery_fee", mode="before")
    @classmethod
    def delivery_fee_cannot_be_null(cls, value: Decimal) -> Decimal:
        if value is None:
            raise ValueError("delivery_fee cannot be null")
        return value

    @field_validator("is_active", mode="before")
    @classmethod
    def active_status_cannot_be_null(cls, value: bool) -> bool:
        if value is None:
            raise ValueError("is_active cannot be null")
        return value


class DeliveryAreaResponse(BaseModel):
    id: int
    name_ar: str
    name_en: str
    delivery_fee: Decimal
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicDeliveryAreaResponse(BaseModel):
    id: int
    name_ar: str
    name_en: str
    delivery_fee: Decimal

    model_config = ConfigDict(from_attributes=True)


class DeliveryAreaFilter(FilterBase):
    is_active: bool | None = None
    min_delivery_fee: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
    )
    max_delivery_fee: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
    )

    @model_validator(mode="after")
    def validate_fee_range(self):
        if (
            self.min_delivery_fee is not None
            and self.max_delivery_fee is not None
            and self.min_delivery_fee > self.max_delivery_fee
        ):
            raise ValueError(
                "min_delivery_fee must not exceed max_delivery_fee"
            )

        return self


class DeliveryAreaSortBy(str, Enum):
    ID = "id"
    CREATED_AT = "created_at"
    NAME_AR = "name_ar"
    NAME_EN = "name_en"
    DELIVERY_FEE = "delivery_fee"


class DeliveryAreaQuery(QueryBase):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    page: int = Field(default=DEFAULT_PAGE, ge=1, le=MAX_PAGE_NUMBER)
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)
    search: Annotated[
        str | None,
        StringConstraints(
            strip_whitespace=True,
            min_length=1,
            max_length=DELIVERY_AREA_SEARCH_MAX_LENGTH,
        ),
    ] = None
    filter: DeliveryAreaFilter | None = None
    sort_by: DeliveryAreaSortBy | None = None

    @field_validator("search")
    @classmethod
    def normalize_search(cls, value: str | None) -> str | None:
        return value or None


DeliveryAreaListResponse = PageResponse[DeliveryAreaResponse]
PublicDeliveryAreaListResponse = PageResponse[PublicDeliveryAreaResponse]
