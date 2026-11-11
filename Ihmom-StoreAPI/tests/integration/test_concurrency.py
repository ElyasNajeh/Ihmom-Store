from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from http.cookies import SimpleCookie
from threading import Barrier
from uuid import uuid4

from fastapi import HTTPException, Request, Response

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.features.admins.model import Admin
from app.features.auth import service as auth_service
from app.features.auth.model import AdminSession
from app.features.auth.schema import LoginRequest
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.customers.model import Customer
from app.features.delivery_areas.model import DeliveryArea
from app.features.orders import service as order_service
from app.features.orders.model import Order
from app.features.orders.schema import CheckoutRequest
from app.features.products.model import Product, ProductVariant


def _refresh_request(refresh_token: str) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/auth/refresh",
            "headers": [(b"cookie", f"refresh_token={refresh_token}".encode())],
            "client": ("127.0.0.1", 50000),
            "server": ("testserver", 80),
            "scheme": "http",
        }
    )


def test_concurrent_checkout_with_same_key_creates_one_order(test_engine):
    suffix = uuid4().hex[:12]
    key = str(uuid4())
    phone = "+970599876541"
    setup = SessionLocal()
    try:
        category = Category(name_ar=f"فئة {suffix}", name_en=f"Category {suffix}")
        brand = Brand(name_ar=f"علامة {suffix}", name_en=f"Brand {suffix}")
        area = DeliveryArea(
            name_ar=f"منطقة {suffix}",
            name_en=f"Area {suffix}",
            delivery_fee=Decimal("5.00"),
        )
        setup.add_all([category, brand, area])
        setup.flush()
        product = Product(
            category_id=category.id,
            brand_id=brand.id,
            name_ar=f"منتج {suffix}",
            name_en=f"Product {suffix}",
        )
        setup.add(product)
        setup.flush()
        variant = ProductVariant(
            product_id=product.id,
            name_ar="__default__",
            name_en="__default__",
            sku=f"CONCURRENT-{suffix}",
            price=Decimal("12.50"),
        )
        setup.add(variant)
        setup.commit()
        ids = (category.id, brand.id, area.id, product.id, variant.id)
    finally:
        setup.close()

    payload = CheckoutRequest.model_validate(
        {
            "customer_name": "Concurrent Customer",
            "customer_phone": phone,
            "delivery_area_id": ids[2],
            "address": "Concurrency test address",
            "items": [{"product_variant_id": ids[4], "quantity": 1}],
        }
    )
    barrier = Barrier(2)

    def checkout_once():
        db = SessionLocal()
        try:
            barrier.wait(timeout=5)
            return order_service.checkout(db, payload, key)["order_number"]
        finally:
            db.close()

    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            order_numbers = list(executor.map(lambda _: checkout_once(), range(2)))

        verify = SessionLocal()
        try:
            assert order_numbers[0] == order_numbers[1]
            assert verify.query(Order).filter(Order.idempotency_key == key).count() == 1
        finally:
            verify.close()
    finally:
        cleanup = SessionLocal()
        try:
            cleanup.query(Order).filter(Order.idempotency_key == key).delete()
            cleanup.query(Customer).filter(Customer.phone == phone).delete()
            cleanup.query(Product).filter(Product.id == ids[3]).delete()
            cleanup.query(Category).filter(Category.id == ids[0]).delete()
            cleanup.query(Brand).filter(Brand.id == ids[1]).delete()
            cleanup.query(DeliveryArea).filter(DeliveryArea.id == ids[2]).delete()
            cleanup.commit()
        finally:
            cleanup.close()


def test_concurrent_refresh_rotates_once_and_revokes_replayed_family(test_engine):
    suffix = uuid4().hex[:12]
    password = "Concurrent-password-123!"
    setup = SessionLocal()
    try:
        admin = Admin(
            username=f"concurrent-{suffix}",
            email=f"concurrent-{suffix}@example.com",
            hashed_password=hash_password(password),
        )
        setup.add(admin)
        setup.commit()
        admin_id = admin.id
        login_response = Response()
        auth_service.login(
            setup,
            LoginRequest(username=admin.username, password=password),
            login_response,
        )
        cookies = SimpleCookie()
        cookies.load(login_response.headers["set-cookie"])
        refresh_token = cookies["refresh_token"].value
    finally:
        setup.close()

    barrier = Barrier(2)

    def refresh_once():
        db = SessionLocal()
        try:
            barrier.wait(timeout=5)
            try:
                auth_service.refresh_access_token(
                    _refresh_request(refresh_token), Response(), db
                )
                return 200
            except HTTPException as exc:
                return exc.status_code
        finally:
            db.close()

    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = sorted(executor.map(lambda _: refresh_once(), range(2)))
        assert statuses == [200, 401]

        verify = SessionLocal()
        try:
            session = (
                verify.query(AdminSession)
                .filter(AdminSession.admin_id == admin_id)
                .one()
            )
            assert session.rotated_at is not None
            assert session.revoked_at is not None
        finally:
            verify.close()
    finally:
        cleanup = SessionLocal()
        try:
            cleanup.query(Admin).filter(Admin.id == admin_id).delete()
            cleanup.commit()
        finally:
            cleanup.close()
