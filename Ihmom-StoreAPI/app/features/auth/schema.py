from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.constants.admins import ADMIN_USERNAME_MAX_LENGTH


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=ADMIN_USERNAME_MAX_LENGTH)
    password: str = Field(min_length=1)

    @field_validator("username", mode="before")
    @classmethod
    def trim_username(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class LoginResponse(BaseModel):
    message: str
    username: str
    access_token: str
    token_type: str
    expires_in: int


class RefreshResponse(BaseModel):
    message: str
    access_token: str
    token_type: str
    expires_in: int


class CurrentAdminResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str
