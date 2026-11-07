from typing import Any

from app.constants.query import SortDirection


def build_order_by(
    sort_column: Any,
    order: SortDirection,
    id_column: Any,
    *,
    sort_is_id: bool = False,
    nulls_last: bool = False,
    tie_order: SortDirection | None = None,
) -> list[Any]:
    """Build `ORDER BY` clauses with a deterministic id tie-breaker."""
    primary = (
        sort_column.asc()
        if order == SortDirection.ASC
        else sort_column.desc()
    )
    if nulls_last:
        primary = primary.nullslast()

    order_by = [primary]
    if not sort_is_id:
        resolved_tie = tie_order or order
        order_by.append(
            id_column.asc()
            if resolved_tie == SortDirection.ASC
            else id_column.desc()
        )

    return order_by
