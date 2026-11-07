
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
)

from app.constants.brands import (
    BRAND_NAME_MAX_LENGTH,
    BRAND_SEARCH_MAX_LENGTH,
)
from app.constants.query import (
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_NUMBER,
    MAX_PAGE_SIZE,
)
from app.shared.schema import FilterBase, PageResponse, QueryBase


class BrandFilter(FilterBase):
    is_active: bool | None = None


class BrandSortBy(str, Enum):
    ID = "id"
    CREATED_AT = "created_at"
    NAME_AR = "name_ar"
    NAME_EN = "name_en"


class BrandQuery(QueryBase):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    page: int = Field(default=DEFAULT_PAGE, ge=1, le=MAX_PAGE_NUMBER)
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)
    search: Annotated[
        str | None,
        StringConstraints(
            strip_whitespace=True,
            min_length=1,
            max_length=BRAND_SEARCH_MAX_LENGTH,
        ),
    ] = None
    filter: BrandFilter | None = None
    sort_by: BrandSortBy | None = None


class BrandBase(BaseModel):
    name_ar: str = Field(min_length=1, max_length=BRAND_NAME_MAX_LENGTH)
    name_en: str = Field(min_length=1, max_length=BRAND_NAME_MAX_LENGTH)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class BrandCreate(BrandBase):
    is_active: bool = True


class BrandUpdate(BaseModel):
    name_ar: str | None = Field(
        default=None,
        min_length=1,
        max_length=BRAND_NAME_MAX_LENGTH,
    )
    name_en: str | None = Field(
        default=None,
        min_length=1,
        max_length=BRAND_NAME_MAX_LENGTH,
    )
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Brand names cannot be null")
        return value.strip() if isinstance(value, str) else value

    @field_validator("is_active", mode="before")
    @classmethod
    def active_status_cannot_be_null(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError("is_active cannot be null")
        return value


class BrandResponse(BaseModel):
    id: int
    name_ar: str
    name_en: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


BrandListResponse = PageResponse[BrandResponse]
