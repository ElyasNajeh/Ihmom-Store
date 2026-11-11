from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.features.admins.schema import AdminCreate
from app.features.auth.schema import LoginRequest
from app.features.brands.schema import BrandCreate, BrandUpdate
from app.features.delivery_areas.schema import DeliveryAreaCreate, DeliveryAreaFilter
from app.features.orders.schema import (
    CheckoutRequest,
    OrderFilter,
    OrderHistoryVerifyRequest,
)
from app.features.products.schema import (
    ProductCreate,
    ProductFilter,
    ProductUpdate,
    ProductVariantCreate,
)
from app.features.sliders.schema import SliderCreate, SliderUpdate


pytestmark = pytest.mark.unit


def test_login_trims_username_but_preserves_password_spaces():
    value = LoginRequest(username="  admin  ", password=" secret ")
    assert value.username == "admin"
    assert value.password == " secret "


@pytest.mark.parametrize("password", [" " * 8, "é" * 37])
def test_admin_rejects_whitespace_or_password_over_72_utf8_bytes(password):
    with pytest.raises(ValidationError):
        AdminCreate(username="valid-user", email="admin@example.com", password=password)


def test_admin_normalizes_names_and_email():
    value = AdminCreate(
        username="  valid-user  ",
        email="  ADMIN@Example.COM  ",
        password="password1",
    )
    assert value.username == "valid-user"
    assert str(value.email) == "ADMIN@example.com"


@pytest.mark.parametrize("model", [BrandCreate, DeliveryAreaCreate])
def test_bilingual_names_reject_whitespace(model):
    values = {"name_ar": "   ", "name_en": "English"}
    if model is DeliveryAreaCreate:
        values["delivery_fee"] = "1.00"
    with pytest.raises(ValidationError):
        model(**values)


def test_patch_explicit_null_is_rejected_but_empty_patch_is_allowed():
    assert BrandUpdate().model_dump(exclude_unset=True) == {}
    with pytest.raises(ValidationError):
        BrandUpdate(name_en=None)
    assert ProductUpdate(description_en=None).description_en is None
    with pytest.raises(ValidationError):
        ProductUpdate(name_en=None)


@pytest.mark.parametrize("fee", ["-0.01", "100000000.00", "1.001"])
def test_delivery_fee_boundaries(fee):
    with pytest.raises(ValidationError):
        DeliveryAreaCreate(name_ar="منطقة", name_en="Area", delivery_fee=fee)


def test_delivery_filter_rejects_reversed_range():
    with pytest.raises(ValidationError):
        DeliveryAreaFilter(min_delivery_fee="10", max_delivery_fee="9.99")


def test_simple_product_requires_price_and_creates_no_client_default_variant():
    with pytest.raises(ValidationError):
        ProductCreate(category_id=1, brand_id=1, name_ar="منتج", name_en="Product")
    value = ProductCreate(
        category_id=1,
        brand_id=1,
        name_ar=" منتج ",
        name_en=" Product ",
        price="0.00",
        sku="   ",
    )
    assert value.name_ar == "منتج"
    assert value.price == Decimal("0.00")
    assert value.sku is None
    assert value.variants is None


def test_selectable_product_rejects_top_level_price_and_inactive_set():
    variant = {"name_ar": "صغير", "name_en": "Small", "price": "10.00"}
    with pytest.raises(ValidationError):
        ProductCreate(
            category_id=1,
            brand_id=1,
            name_ar="منتج",
            name_en="Product",
            price="5.00",
            variants=[variant],
        )
    with pytest.raises(ValidationError):
        ProductCreate(
            category_id=1,
            brand_id=1,
            name_ar="منتج",
            name_en="Product",
            variants=[{**variant, "is_active": False}],
        )


def test_internal_variant_name_is_reserved_only_as_a_pair():
    with pytest.raises(ValidationError):
        ProductVariantCreate(
            name_ar="__default__",
            name_en="__default__",
            price="1.00",
        )
    allowed = ProductVariantCreate(
        name_ar="__default__",
        name_en="Visible",
        price="1.00",
    )
    assert allowed.name_en == "Visible"


@pytest.mark.parametrize("field", ["product_variant_id", "quantity"])
@pytest.mark.parametrize("value", [True, 1.0, "1"])
def test_checkout_ids_and_quantities_are_strict_integers(field, value):
    item = {"product_variant_id": 1, "quantity": 1}
    item[field] = value
    with pytest.raises(ValidationError):
        CheckoutRequest(
            customer_name="Customer",
            customer_phone="0599123456",
            delivery_area_id=1,
            address="Address",
            items=[item],
        )


def test_checkout_rejects_empty_duplicate_and_unknown_fields():
    base = {
        "customer_name": "Customer",
        "customer_phone": "0599123456",
        "delivery_area_id": 1,
        "address": "Address",
    }
    with pytest.raises(ValidationError):
        CheckoutRequest(**base, items=[])
    with pytest.raises(ValidationError):
        CheckoutRequest(
            **base,
            items=[
                {"product_variant_id": 1, "quantity": 1},
                {"product_variant_id": 1, "quantity": 2},
            ],
        )
    with pytest.raises(ValidationError):
        CheckoutRequest(
            **base,
            items=[{"product_variant_id": 1, "quantity": 1}],
            total="0.01",
        )


def test_checkout_normalizes_optional_text_and_phone():
    value = CheckoutRequest(
        customer_name="  Customer  ",
        customer_phone=" 0599123456 ",
        delivery_area_id=1,
        address="  Address  ",
        notes="   ",
        items=[{"product_variant_id": 1, "quantity": 1}],
    )
    assert value.customer_phone == "+970599123456"
    assert value.customer_name == "Customer"
    assert value.address == "Address"
    assert value.notes is None


def test_history_order_number_hash_prefix_is_normalized():
    value = OrderHistoryVerifyRequest(
        phone="0599123456",
        order_number="  # IHM-random  ",
    )
    assert value.order_number == "IHM-random"


def test_money_and_date_filters_reject_reversed_ranges():
    with pytest.raises(ValidationError):
        ProductFilter(min_price="20.00", max_price="10.00")
    with pytest.raises(ValidationError):
        OrderFilter(date_from="2026-11-11", date_to="2026-11-10")
    with pytest.raises(ValidationError):
        OrderFilter(min_total="20.00", max_total="10.00")


@pytest.mark.parametrize("value", [None, True])
def test_slider_patch_rejects_null_and_boolean_display_order(value):
    with pytest.raises(ValidationError):
        SliderUpdate(display_order=value)


def test_slider_create_rejects_boolean_display_order():
    with pytest.raises(ValidationError):
        SliderCreate(title_ar="عنوان", title_en="Title", display_order=True)
