from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.shared.schema import PageResponse


class DeliveryAreaBase(BaseModel):
    name_ar: str = Field(min_length=1, max_length=150)
    name_en: str = Field(min_length=1, max_length=150)
    delivery_fee: Decimal = Field(ge=0, max_digits=10, decimal_places=2)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class DeliveryAreaCreate(DeliveryAreaBase):
    is_active: bool = True


class DeliveryAreaUpdate(BaseModel):
    name_ar: str | None = Field(default=None, min_length=1, max_length=150)
    name_en: str | None = Field(default=None, min_length=1, max_length=150)
    delivery_fee: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=2,
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
    def delivery_fee_cannot_be_null(cls, value: Decimal | None) -> Decimal:
        if value is None:
            raise ValueError("delivery_fee cannot be null")
        return value

    @field_validator("is_active", mode="before")
    @classmethod
    def active_status_cannot_be_null(cls, value: bool | None) -> bool:
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


DeliveryAreaListResponse = PageResponse[DeliveryAreaResponse]


PublicDeliveryAreaListResponse = PageResponse[PublicDeliveryAreaResponse]
