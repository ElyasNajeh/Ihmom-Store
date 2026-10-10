from typing import Annotated

from pydantic import AfterValidator, StringConstraints


PHONE_PATTERN = r"^\+(?:970|972)5[0-9]{8}$"
INTERNATIONAL_MOBILE_PREFIXES = ("+9705", "+9725")
MOBILE_PREFIXES_WITHOUT_PLUS = ("9705", "9725")
LOCAL_MOBILE_PREFIX = "05"


def normalize_phone(phone: str) -> str:
    """Validate and return a phone in canonical international format."""
    value = phone.strip()

    if len(value) == 13 and value.startswith(INTERNATIONAL_MOBILE_PREFIXES):
        normalized = value
    elif len(value) == 12 and value.startswith(MOBILE_PREFIXES_WITHOUT_PLUS):
        normalized = f"+{value}"
    elif len(value) == 10 and value.startswith(LOCAL_MOBILE_PREFIX):
        normalized = f"+970{value[1:]}"
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
