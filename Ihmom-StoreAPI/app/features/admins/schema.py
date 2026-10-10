from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _validate_password(value: str) -> str:
    if not value.strip():
        raise ValueError("Password cannot be empty or whitespace only")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")
    return value


class AdminBase(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr = Field(max_length=255)

    @field_validator("username", "email", mode="before")
    @classmethod
    def trim_text_fields(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class AdminCreate(AdminBase):
    password: str = Field(min_length=8)

    _password_length = field_validator("password")(_validate_password)


class AdminResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
