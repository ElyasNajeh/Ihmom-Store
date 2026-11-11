from datetime import datetime, timezone
from decimal import Decimal
import re

import pytest
from fastapi import HTTPException

from app.features.dashboard.service import _iter_buckets, _shift_months
from app.features.orders.service import _generate_order_number, _validate_money


pytestmark = pytest.mark.unit


def test_order_numbers_are_random_and_high_entropy_shape():
    values = {_generate_order_number() for _ in range(100)}
    assert len(values) == 100
    assert all(re.fullmatch(r"IHM-[A-Za-z0-9_-]{24}", value) for value in values)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [(Decimal("1"), Decimal("1.00")), (Decimal("1.005"), Decimal("1.00"))],
)
def test_money_is_quantized_with_decimal_rules(raw, expected):
    assert _validate_money(raw, "invalid") == expected


@pytest.mark.parametrize("raw", [Decimal("NaN"), Decimal("Infinity"), Decimal("-0.01"), Decimal("100000000")])
def test_invalid_money_is_rejected(raw):
    with pytest.raises(HTTPException) as exc:
        _validate_money(raw, "invalid")
    assert exc.value.status_code == 422


def test_month_shift_handles_year_boundaries():
    value = datetime(2026, 1, 31, tzinfo=timezone.utc)
    assert _shift_months(value, -1) == datetime(2025, 12, 1, tzinfo=timezone.utc)
    assert _shift_months(value, 12) == datetime(2027, 1, 1, tzinfo=timezone.utc)


def test_bucket_iterator_is_inclusive():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 1, 3, tzinfo=timezone.utc)
    assert list(_iter_buckets(start, end, "day")) == [
        datetime(2026, 1, 1, tzinfo=timezone.utc),
        datetime(2026, 1, 2, tzinfo=timezone.utc),
        datetime(2026, 1, 3, tzinfo=timezone.utc),
    ]
