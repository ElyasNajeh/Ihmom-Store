from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.shared.schema import PageResponse


ProductSort = Literal[
    "newest",
    "oldest",
    "name_ar",
    "name_en",
    "price_asc",
    "price_desc",
]
ProductAdminSort = Literal["id", "created_at", "name_ar", "name_en", "price"]
SortOrder = Literal["asc", "desc"]


class ProductVariantBase(BaseModel):
    name_ar: str = Field(min_length=1, max_length=100)
    name_en: str = Field(min_length=1, max_length=100)
    sku: str | None = Field(default=None, max_length=100)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("sku", mode="before")
    @classmethod
    def normalize_sku(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def internal_name_is_reserved(self):
        if self.name_ar == "__default__" and self.name_en == "__default__":
            raise ValueError("The internal default variant name is reserved")
        return self


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    name_ar: str | None = Field(default=None, min_length=1, max_length=100)
    name_en: str | None = Field(default=None, min_length=1, max_length=100)
    sku: str | None = Field(default=None, max_length=100)
    price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=2,
    )
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Variant names cannot be null")
        return value.strip() if isinstance(value, str) else value

    @field_validator("sku", mode="before")
    @classmethod
    def normalize_sku(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("price", mode="before")
    @classmethod
    def price_cannot_be_null(cls, value: Decimal | None) -> Decimal:
        if value is None:
            raise ValueError("price cannot be null")
        return value

    @field_validator("is_active", mode="before")
    @classmethod
    def active_status_cannot_be_null(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError("is_active cannot be null")
        return value


class ProductBase(BaseModel):
    category_id: int = Field(ge=1)
    brand_id: int = Field(ge=1)
    name_ar: str = Field(min_length=1, max_length=200)
    name_en: str = Field(min_length=1, max_length=200)
    description_ar: str | None = None
    description_en: str | None = None
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("description_ar", "description_en", mode="before")
    @classmethod
    def normalize_descriptions(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        return value


class ProductCreate(ProductBase):
    price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=2,
    )
    sku: str | None = Field(default=None, max_length=100)
    variants: list[ProductVariantCreate] | None = None

    @field_validator("sku", mode="before")
    @classmethod
    def normalize_sku(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def validate_variant_input(self):
        if self.variants is None:
            if self.price is None:
                raise ValueError("A price is required for a simple product")
            return self

        if not self.variants:
            raise ValueError("A product must have at least one variant")
        if self.price is not None or self.sku is not None:
            raise ValueError(
                "Use either a simple-product price or selectable variants, not both"
            )

        if self.is_active and not any(variant.is_active for variant in self.variants):
            raise ValueError("An active product requires an active variant")
        return self


class ProductUpdate(BaseModel):
    category_id: int | None = Field(default=None, ge=1)
    brand_id: int | None = Field(default=None, ge=1)
    name_ar: str | None = Field(default=None, min_length=1, max_length=200)
    name_en: str | None = Field(default=None, min_length=1, max_length=200)
    description_ar: str | None = None
    description_en: str | None = None
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("category_id", "brand_id", mode="before")
    @classmethod
    def related_id_cannot_be_null(cls, value: int | None) -> int:
        if value is None:
            raise ValueError("Category and brand IDs cannot be null")
        return value

    @field_validator("name_ar", "name_en", mode="before")
    @classmethod
    def trim_names(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Product names cannot be null")
        return value.strip() if isinstance(value, str) else value

    @field_validator("description_ar", "description_en", mode="before")
    @classmethod
    def normalize_descriptions(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("is_active", mode="before")
    @classmethod
    def active_status_cannot_be_null(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError("is_active cannot be null")
        return value


class CategorySummary(BaseModel):
    id: int
    name_ar: str
    name_en: str

    model_config = ConfigDict(from_attributes=True)


class BrandSummary(BaseModel):
    id: int
    name_ar: str
    name_en: str

    model_config = ConfigDict(from_attributes=True)


class ProductVariantResponse(BaseModel):
    id: int
    product_id: int
    name_ar: str
    name_en: str
    sku: str | None
    price: Decimal
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicProductVariantResponse(BaseModel):
    id: int
    name_ar: str | None = None
    name_en: str | None = None
    price: Decimal


class ProductImageResponse(BaseModel):
    id: int
    product_id: int
    image: str
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicProductImageResponse(BaseModel):
    id: int
    image: str
    is_primary: bool

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: int
    category_id: int
    brand_id: int
    name_ar: str
    name_en: str
    description_ar: str | None
    description_en: str | None
    is_active: bool
    created_at: datetime
    category: CategorySummary
    brand: BrandSummary
    variants: list[ProductVariantResponse]
    images: list[ProductImageResponse]

    model_config = ConfigDict(from_attributes=True)


class PublicProductResponse(BaseModel):
    id: int
    category_id: int
    brand_id: int
    name_ar: str
    name_en: str
    description_ar: str | None
    description_en: str | None
    starting_price: Decimal
    has_selectable_variants: bool
    category: CategorySummary
    brand: BrandSummary
    variants: list[PublicProductVariantResponse]
    images: list[PublicProductImageResponse]


ProductListResponse = PageResponse[ProductResponse]


PublicProductListResponse = PageResponse[PublicProductResponse]
