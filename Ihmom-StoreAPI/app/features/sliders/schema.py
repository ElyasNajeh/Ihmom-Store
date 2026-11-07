
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants.sliders import (
    SLIDER_DEFAULT_DISPLAY_ORDER,
    SLIDER_TITLE_MAX_LENGTH,
)
from app.shared.schema import FilterBase, PageResponse, QueryBase


class SliderBase(BaseModel):
    title_ar: str = Field(min_length=1, max_length=SLIDER_TITLE_MAX_LENGTH)
    title_en: str = Field(min_length=1, max_length=SLIDER_TITLE_MAX_LENGTH)

    @field_validator("title_ar", "title_en", mode="before")
    @classmethod
    def trim_titles(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class SliderCreate(SliderBase):
    display_order: int = SLIDER_DEFAULT_DISPLAY_ORDER
    is_active: bool = True

    @field_validator("display_order", mode="before")
    @classmethod
    def display_order_must_be_an_integer(cls, value):
        if isinstance(value, bool):
            raise ValueError("display_order must be an integer")
        return value


class SliderUpdate(BaseModel):
    title_ar: str | None = Field(
        default=None,
        min_length=1,
        max_length=SLIDER_TITLE_MAX_LENGTH,
    )
    title_en: str | None = Field(
        default=None,
        min_length=1,
        max_length=SLIDER_TITLE_MAX_LENGTH,
    )
    display_order: int | None = None
    is_active: bool | None = None

    @field_validator("title_ar", "title_en", mode="before")
    @classmethod
    def trim_titles(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Sliders titles cannot be null")
        return value.strip() if isinstance(value, str) else value

    @field_validator("display_order", mode="before")
    @classmethod
    def validate_display_order(cls, value):
        if value is None:
            raise ValueError("display_order cannot be null")
        if isinstance(value, bool):
            raise ValueError("display_order must be an integer")
        return value

    @field_validator("is_active", mode="before")
    @classmethod
    def active_status_cannot_be_null(cls, value):
        if value is None:
            raise ValueError("is_active cannot be null")
        return value


class SliderResponse(BaseModel):
    id: int
    title_ar: str
    title_en: str
    display_order: int
    is_active: bool
    image: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SliderFilter(FilterBase):
    is_active: bool | None = None
    display_order: int | None = None


class SliderSortBy(str, Enum):
    ID = "id"
    CREATED_AT = "created_at"
    DISPLAY_ORDER = "display_order"
    TITLE_AR = "title_ar"
    TITLE_EN = "title_en"

class SliderQuery(QueryBase):
    filter: SliderFilter | None = None
    sort_by: SliderSortBy | None = None


SliderListResponse = PageResponse[SliderResponse]
