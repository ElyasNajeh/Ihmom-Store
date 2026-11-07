from datetime import datetime
from typing import Generic, TypeVar

from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.constants.query import (
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_NUMBER,
    SortDirection,
)

ItemType = TypeVar("ItemType")


class ImageResponseBase(BaseModel):
    id: int
    image: str
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PageResponse(BaseModel, Generic[ItemType]):
    items: list[ItemType]
    total: int
    page: int
    page_size: int
    total_pages: int


class FilterBase(BaseModel):
    model_config = ConfigDict(extra='forbid')

class QueryBase(BaseModel):
    model_config = ConfigDict(extra='forbid')
    search: Annotated[
        str | None,
        StringConstraints(
            strip_whitespace=True,
            min_length=1,
            max_length=256,
        ),
    ] = None
    filter: dict[str, Any] | None = None
    sort_by: str | None = None
    order: SortDirection | None = None
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1)
    page: int = Field(default=DEFAULT_PAGE, ge=1, le=MAX_PAGE_NUMBER)
