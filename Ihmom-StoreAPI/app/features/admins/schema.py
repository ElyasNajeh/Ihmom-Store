from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.constants.admins import (
    ADMIN_EMAIL_MAX_LENGTH,
    ADMIN_PASSWORD_MAX_BYTES,
    ADMIN_PASSWORD_MIN_LENGTH,
    ADMIN_SEARCH_MAX_LENGTH,
    ADMIN_USERNAME_MAX_LENGTH,
    ADMIN_USERNAME_MIN_LENGTH,
)
from app.shared.schema import FilterBase, QueryBase

from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from enum import Enum


def _validate_password(value: str) -> str:
    if not value.strip():
        raise ValueError("Password cannot contain only spaces")
    if len(value.encode("utf-8")) > ADMIN_PASSWORD_MAX_BYTES:
        raise ValueError("Password is too long")
    return value


class AdminBase(BaseModel):
    username: str = Field(
        min_length=ADMIN_USERNAME_MIN_LENGTH,
        max_length=ADMIN_USERNAME_MAX_LENGTH,
    )
    email: EmailStr = Field(max_length=ADMIN_EMAIL_MAX_LENGTH)

    @field_validator("username", "email", mode="before")
    @classmethod
    def trim_text_fields(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class AdminCreate(AdminBase):
    password: str = Field(min_length=ADMIN_PASSWORD_MIN_LENGTH)

    _password_length = field_validator("password")(_validate_password)


class AdminResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminSortBy(str, Enum):
    USERNAME = 'username'
    CREATED_AT_UTC = 'created_at_utc'
    ID = 'id'


class AdminFilter(FilterBase):
    pass


class AdminQuery(QueryBase):
    model_config = ConfigDict(extra='forbid')
    search: str | None = Field(
        default=None,
        min_length=1,
        max_length=ADMIN_SEARCH_MAX_LENGTH,
    )
    filter: AdminFilter | None = None
    sort_by: AdminSortBy | None = None