
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.constants.customers import (
    CUSTOMER_NAME_MAX_LENGTH,
    CUSTOMER_PHONE_MAX_LENGTH,
    CUSTOMER_SEARCH_MAX_LENGTH,
)
from app.constants.query import (
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_NUMBER,
    MAX_PAGE_SIZE,
)
from app.shared.phone import PhoneNumber
from app.shared.schema import FilterBase, PageResponse, QueryBase


class CustomerFilter(FilterBase):
    pass


class CustomerSortBy(str, Enum):
    ID = "id"
    CREATED_AT = "created_at"
    NAME = "name"


class CustomerQuery(QueryBase):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    page: int = Field(default=DEFAULT_PAGE, ge=1, le=MAX_PAGE_NUMBER)
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)
    search: Annotated[
        str | None,
        StringConstraints(
            strip_whitespace=True,
            min_length=1,
            max_length=CUSTOMER_SEARCH_MAX_LENGTH,
        ),
    ] = None
    filter: CustomerFilter | None = None
    sort_by: CustomerSortBy | None = None

    @field_validator("search")
    @classmethod
    def normalize_search(cls, value: str | None) -> str | None:
        return value or None


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=CUSTOMER_NAME_MAX_LENGTH)
    phone: PhoneNumber = Field(max_length=CUSTOMER_PHONE_MAX_LENGTH)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=CUSTOMER_NAME_MAX_LENGTH,
    )
    phone: PhoneNumber | None = Field(
        default=None,
        max_length=CUSTOMER_PHONE_MAX_LENGTH,
    )

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
