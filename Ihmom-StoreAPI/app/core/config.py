from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    APP_NAME: str

    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_USER: str
    DATABASE_PASSWORD: str
    DATABASE_NAME: str

    REDIS_URL: str = "redis://redis:6379/0"
    LOGIN_RATE_WINDOW_SECONDS: int = Field(default=900, ge=1)
    LOGIN_RATE_LIMIT_PER_ACCOUNT: int = Field(default=5, ge=1)
    LOGIN_RATE_LIMIT_PER_IP: int = Field(default=20, ge=1)
    CHECKOUT_RATE_WINDOW_SECONDS: int = Field(default=60, ge=1)
    CHECKOUT_RATE_LIMIT_PER_IP: int = Field(default=30, ge=1)
    RATE_LIMIT_KEY_PREFIX: str = "ihmom:rate-limit"

    # Bird configuration is validated by the worker, never by checkout startup.
    # Keep optional values as strings so a typo cannot take ordering offline.
    BIRD_NOTIFICATIONS_ENABLED: bool = False
    BIRD_API_KEY: SecretStr = SecretStr("")
    BIRD_API_URL: str = "https://eu1.platform.bird.com/v1/whatsapp/messages"
    BIRD_ORDER_NOTIFICATION_PHONE: str = ""
    BIRD_ORDER_TEMPLATE: str = "bird_order_confirmation"
    BIRD_ORDER_TEMPLATE_LANGUAGE: str = "en"
    BIRD_WEBHOOK_SECRET: SecretStr = SecretStr("")
    BIRD_MAX_ATTEMPTS: str = "6"
    BIRD_POLL_SECONDS: str = "5"
    BIRD_STATUS_POLL_SECONDS: str = "60"
    BIRD_STATUS_MAX_CHECKS: str = "48"
    BIRD_CONNECT_TIMEOUT_SECONDS: str = "5"
    BIRD_READ_TIMEOUT_SECONDS: str = "10"

    @field_validator("BIRD_NOTIFICATIONS_ENABLED", mode="before")
    @classmethod
    def optional_bird_enabled(cls, value):
        return value is True or str(value).strip().lower() in {"true", "1", "yes", "on"}

    SECRET_KEY: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, gt=0)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, gt=0)
    ADMIN_SESSION_RETENTION_DAYS: int = Field(default=30, ge=1)

    ORDER_HISTORY_TOKEN_EXPIRE_MINUTES: int = Field(
        default=10,
        gt=0,
        le=60,
    )
    ORDER_HISTORY_RATE_WINDOW_SECONDS: int = Field(
        default=300,
        ge=10,
        le=86_400,
    )
    ORDER_HISTORY_RATE_LIMIT_PER_IP: int = Field(default=10, gt=0)
    ORDER_HISTORY_RATE_LIMIT_PER_PHONE: int = Field(default=5, gt=0)
    ORDER_HISTORY_RATE_LIMIT_GLOBAL: int = Field(default=500, gt=0)

    ALGORITHM: Literal["HS256", "HS384", "HS512"] = "HS256"

    CORS_ORIGINS: str = "http://localhost:5173"

    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "strict"
    UPLOAD_ROOT: Path = Path("/app/uploads")

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def DATABASE_URL(self) -> str:
        return URL.create(
            drivername="postgresql+psycopg2",
            username=self.DATABASE_USER,
            password=self.DATABASE_PASSWORD,
            host=self.DATABASE_HOST,
            port=self.DATABASE_PORT,
            database=self.DATABASE_NAME,
        ).render_as_string(hide_password=False)

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]


settings = Settings()
