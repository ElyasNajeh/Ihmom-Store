"""Optional provider configuration. Invalid settings pause notifications only."""

from dataclasses import dataclass, field
import hashlib
import re

from app.core.config import Settings


BIRD_MESSAGES_URL = "https://eu1.platform.bird.com/v1/whatsapp/messages"
# Bird documents 3h response replay. Stop 10m early, including crash recovery.
SAFE_REPLAY_SECONDS = 10_200
REQUEST_DEADLINE_SECONDS = 30
LEASE_SECONDS = 90


def owner_phone(value: str) -> str:
    value = re.sub(r"[\s().-]", "", value.strip())
    if value.startswith("00"):
        value = "+" + value[2:]
    if not re.fullmatch(r"\+[1-9][0-9]{7,14}", value):
        raise ValueError("invalid_owner_phone")
    return value


def recipient_hash(phone: str) -> str:
    return hashlib.sha256(owner_phone(phone).encode()).hexdigest()


@dataclass(frozen=True)
class BirdConfig:
    api_key: str = field(repr=False)
    phone: str = field(repr=False)
    url: str = BIRD_MESSAGES_URL
    template: str = "bird_order_confirmation"
    language: str = "en"
    max_attempts: int = 6
    poll_seconds: int = 5
    status_poll_seconds: int = 60
    status_max_checks: int = 48
    connect_timeout: int = 5
    read_timeout: int = 10

    @property
    def credential_hash(self):
        return hashlib.sha256(self.api_key.encode()).hexdigest()


def bird_config(settings: Settings) -> tuple[BirdConfig | None, str | None]:
    if not settings.BIRD_NOTIFICATIONS_ENABLED:
        return None, "disabled"
    try:
        key = settings.BIRD_API_KEY.get_secret_value().strip()
        if not key or any(c.isspace() for c in key):
            raise ValueError("invalid_api_key")
        if settings.BIRD_API_URL != BIRD_MESSAGES_URL:
            raise ValueError("invalid_api_url")
        phone = owner_phone(settings.BIRD_ORDER_NOTIFICATION_PHONE)
        template = settings.BIRD_ORDER_TEMPLATE
        language = settings.BIRD_ORDER_TEMPLATE_LANGUAGE
        if not re.fullmatch(r"[a-z0-9_]{1,100}", template):
            raise ValueError("invalid_template")
        if not re.fullmatch(r"[a-z]{2}(?:[-_][A-Za-z]{2,4})?", language):
            raise ValueError("invalid_language")
        values = {}
        for name, maximum in {
            "max_attempts": 20,
            "poll_seconds": 60,
            "status_poll_seconds": 3600,
            "status_max_checks": 1000,
            "connect_timeout": 10,
            "read_timeout": 20,
        }.items():
            env_name = {
                "connect_timeout": "BIRD_CONNECT_TIMEOUT_SECONDS",
                "read_timeout": "BIRD_READ_TIMEOUT_SECONDS",
            }.get(name, "BIRD_" + name.upper())
            raw = getattr(settings, env_name)
            try:
                number = int(raw)
            except (ValueError, TypeError):
                raise ValueError("invalid_worker_policy") from None
            if not 1 <= number <= maximum:
                raise ValueError("invalid_worker_policy")
            values[name] = number
        return BirdConfig(
            key, phone, template=template, language=language, **values
        ), None
    except ValueError as exc:
        # These are internal fixed codes, never the offending environment value.
        return None, str(exc)
