from collections.abc import Sequence
from typing import Any

from sqlalchemy import or_


def escape_like(value: str) -> str:
    """Escape LIKE wildcards so user input is matched literally."""
    return (
        value.strip()
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )


def like_pattern(value: str | None) -> str | None:
    """Return a `%term%` pattern, or None when there is nothing to search."""
    if value is None:
        return None

    escaped = escape_like(value)
    return f"%{escaped}%" if escaped else None


def ilike_any(
    columns: Sequence[Any],
    value: str | None,
) -> Any | None:
    """Case-insensitive match of one search term against any of the columns."""
    term = like_pattern(value)
    if term is None or not columns:
        return None

    return or_(*(column.ilike(term, escape="\\") for column in columns))
