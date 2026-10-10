from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.shared.schema import PageResponse


class SliderBase(BaseModel):
    title_ar: str = Field(min_length=1, max_length=200)
    title_en: str = Field(min_length=1, max_length=200)

    @field_validator("title_ar", "title_en", mode="before")
    @classmethod
    def trim_titles(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class SliderCreate(SliderBase):
    display_order: int = 0
    is_active: bool = True

    @field_validator("display_order", mode="before")
    @classmethod
    def display_order_must_be_an_integer(cls, value):
        if isinstance(value, bool):
            raise ValueError("display_order must be an integer")
        return value


class SliderUpdate(BaseModel):
    title_ar: str | None = Field(default=None, min_length=1, max_length=200)
    title_en: str | None = Field(default=None, min_length=1, max_length=200)
    display_order: int | None = None
    is_active: bool | None = None

    @field_validator("title_ar", "title_en", mode="before")
    @classmethod
    def trim_titles(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Slider titles cannot be null")
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


SliderListResponse = PageResponse[SliderResponse]
