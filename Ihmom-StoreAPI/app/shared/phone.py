from typing import Annotated

from pydantic import AfterValidator, StringConstraints

from app.constants.phone import (
    DEFAULT_COUNTRY_CODE,
    INTERNATIONAL_MOBILE_PREFIXES,
    INTERNATIONAL_PHONE_LENGTH,
    LOCAL_MOBILE_PREFIX,
    LOCAL_PHONE_LENGTH,
    MOBILE_PREFIXES_WITHOUT_PLUS,
    NATIONAL_WITH_COUNTRY_LENGTH,
)


def normalize_phone(phone: str) -> str:
    """Validate and return a phone in canonical international format."""
    value = phone.strip()

    if len(value) == INTERNATIONAL_PHONE_LENGTH and value.startswith(
        INTERNATIONAL_MOBILE_PREFIXES
    ):
        normalized = value
    elif len(value) == NATIONAL_WITH_COUNTRY_LENGTH and value.startswith(
        MOBILE_PREFIXES_WITHOUT_PLUS
    ):
        normalized = f"+{value}"
    elif len(value) == LOCAL_PHONE_LENGTH and value.startswith(LOCAL_MOBILE_PREFIX):
        normalized = f"{DEFAULT_COUNTRY_CODE}{value[1:]}"
    else:
        raise ValueError(
            "Phone must use +970 or +972 followed by a 9-digit number "
            "beginning with 5"
        )

    if not normalized[1:].isdigit():
        raise ValueError("Phone may contain digits only after the country code")

    return normalized

PhoneNumber = Annotated[
    str,
    StringConstraints(strip_whitespace=True),
    AfterValidator(normalize_phone),
]


def phone_identity(phone: str) -> str:
    """Return the canonical identity, including the selected country code."""
    return normalize_phone(phone)
