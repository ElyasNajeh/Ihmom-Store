from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any, TypeVar

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError

QueryModel = TypeVar("QueryModel", bound=BaseModel)


def _query_error(
    message: str,
    key: str,
    value: Any,
    error_type: str = "value_error",
) -> RequestValidationError:
    return RequestValidationError(
        [
            {
                "type": error_type,
                "loc": ("query", key),
                "msg": message,
                "input": value,
            }
        ]
    )


@dataclass(frozen=True)
class QueryRules:
    """How raw query-string keys map onto a feature's query model.

    `declared` keys are already validated by the endpoint signature and are
    ignored while scanning. Filter fields may appear as `filter[name]`; with
    `bare_filter_aliases` a bare `name` is accepted too.
    """

    declared: frozenset[str]
    filter_fields: frozenset[str] = frozenset()
    repeatable: frozenset[str] = frozenset()
    bare_filter_aliases: bool = False
    reject_repeated_filters: bool = False
    sort_order_alias: bool = False
    carry_unknown: bool = True

    @classmethod
    def create(
        cls,
        *,
        declared: Iterable[str],
        filter_fields: Iterable[str] = (),
        repeatable: Iterable[str] = (),
        **options: Any,
    ) -> "QueryRules":
        return cls(
            declared=frozenset(declared),
            filter_fields=frozenset(filter_fields),
            repeatable=frozenset(repeatable),
            **options,
        )


def parse_query(
    request: Request,
    model: type[QueryModel],
    *,
    values: Mapping[str, Any],
    filters: Mapping[str, Any] | None = None,
    rules: QueryRules,
) -> QueryModel:
    """Validate a query model from endpoint-parsed values plus raw extras."""
    payload = dict(values)
    merged_filters = dict(filters or {})
    seen: set[str] = set()
    seen_filters: set[str] = set()

    for key, value in request.query_params.multi_items():
        if key not in rules.repeatable and key in seen:
            raise _query_error(f"Duplicate query parameter: {key}", key, value)

        seen.add(key)

        if key.startswith("filter[") and key.endswith("]"):
            field = key[len("filter[") : -1]
            if field in rules.filter_fields:
                seen_filters.add(field)
            elif rules.carry_unknown:
                payload[key] = value
        elif rules.bare_filter_aliases and key in rules.filter_fields:
            if rules.reject_repeated_filters and (
                key in seen_filters or f"filter[{key}]" in request.query_params
            ):
                raise _query_error(
                    f"Filter '{key}' must not be repeated",
                    key,
                    value,
                )

            seen_filters.add(key)
            merged_filters[key] = value
        elif key == "sort_order" and rules.sort_order_alias:
            if "order" in request.query_params:
                payload[key] = value
            else:
                payload["order"] = value
        elif key not in rules.declared and rules.carry_unknown:
            payload[key] = value

    if merged_filters:
        payload["filter"] = merged_filters

    try:
        return model.model_validate(
            {key: value for key, value in payload.items() if value is not None}
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc
