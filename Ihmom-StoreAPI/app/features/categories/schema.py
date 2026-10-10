from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.shared.schema import PageResponse


class CategoryBase(BaseModel):
    name_ar: str = Field(min_length=1, max_length=100)
    name_en: str = Field(min_length=1, max_length=100)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class CategoryCreate(CategoryBase):
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name_ar: str | None = Field(default=None, min_length=1, max_length=100)
    name_en: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Category names cannot be null")
        return value.strip() if isinstance(value, str) else value

    @field_validator("is_active", mode="before")
    @classmethod
    def active_status_cannot_be_null(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError("is_active cannot be null")
        return value


class CategoryResponse(BaseModel):
    id: int
    name_ar: str
    name_en: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


CategoryListResponse = PageResponse[CategoryResponse]
