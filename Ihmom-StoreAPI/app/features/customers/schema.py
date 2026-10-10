from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.shared.phone import PhoneNumber
from app.shared.schema import PageResponse


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: PhoneNumber = Field(max_length=30)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    phone: PhoneNumber | None = Field(default=None, max_length=30)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Customer name cannot be null")
        return value.strip() if isinstance(value, str) else value

    @field_validator("phone", mode="before")
    @classmethod
    def phone_cannot_be_null(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Customer phone cannot be null")
        return value


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


CustomerListResponse = PageResponse[CustomerResponse]
