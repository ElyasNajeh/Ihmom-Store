from typing import Generic, TypeVar

from pydantic import BaseModel


ItemType = TypeVar("ItemType")


class ImageUploadResponse(BaseModel):
    filename: str
    path: str


class PageResponse(BaseModel, Generic[ItemType]):
    items: list[ItemType]
    total: int
    page: int
    page_size: int
    total_pages: int
