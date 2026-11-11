"""Insert the static store data defined in ``app.db.seed_data``.

Run with ``python -m app.db.seed`` inside the API environment. The command is
idempotent: existing categories, brands, delivery areas, and products are
reused instead of duplicated. It only inserts missing records; it never updates
or deletes existing data.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.seed_data import BRANDS, CATEGORIES, DELIVERY_AREAS, PRODUCTS
from app.db.session import SessionLocal
from app.features.brands import service as brand_service
from app.features.brands.model import Brand
from app.features.brands.schema import BrandCreate
from app.features.categories import service as category_service
from app.features.categories.model import Category
from app.features.categories.schema import CategoryCreate
from app.features.customers.model import Customer  # noqa: F401
from app.features.delivery_areas import service as delivery_area_service
from app.features.delivery_areas.model import DeliveryArea
from app.features.delivery_areas.schema import DeliveryAreaCreate
from app.features.products import service as product_service
from app.features.products.model import Product
from app.features.products.schema import ProductCreate, ProductVariantCreate


def _find_named_record(db: Session, model, item: dict):
    return (
        db.query(model)
        .filter(
            (model.name_en == item["name_en"])
            | (model.name_ar == item["name_ar"])
        )
        .first()
    )


def _ensure_reference_records(
    db: Session,
    model,
    items: list[dict],
    create,
) -> tuple[dict[str, int], dict[str, int]]:
    ids: dict[str, int] = {}
    created = 0
    skipped = 0

    for item in items:
        record = _find_named_record(db, model, item)
        if record is None:
            record = create(db, item)
            created += 1
        else:
            skipped += 1
        ids[item["name_en"]] = record.id

    return ids, {"created": created, "skipped": skipped}


def _seed_categories(db: Session):
    return _ensure_reference_records(
        db,
        Category,
        CATEGORIES,
        lambda session, item: category_service.create_category(
            session,
            CategoryCreate(**item),
            commit=False,
        ),
    )


def _seed_brands(db: Session):
    return _ensure_reference_records(
        db,
        Brand,
        BRANDS,
        lambda session, item: brand_service.create_brand(
            session,
            BrandCreate(**item),
            commit=False,
        ),
    )


def _seed_delivery_areas(db: Session):
    return _ensure_reference_records(
        db,
        DeliveryArea,
        DELIVERY_AREAS,
        lambda session, item: delivery_area_service.create_delivery_area(
            session,
            DeliveryAreaCreate(**item),
            commit=False,
        ),
    )


def _product_data(item: dict, category_id: int, brand_id: int) -> ProductCreate:
    values = {
        "category_id": category_id,
        "brand_id": brand_id,
        "name_ar": item["name_ar"],
        "name_en": item["name_en"],
        "description_ar": item.get("description_ar"),
        "description_en": item.get("description_en"),
        "is_active": True,
    }

    if "variants" in item:
        values["variants"] = [
            ProductVariantCreate(**variant)
            for variant in item["variants"]
        ]
    else:
        values["price"] = item["price"]
        values["sku"] = item.get("sku")

    return ProductCreate(**values)


def _seed_products(
    db: Session,
    category_ids: dict[str, int],
    brand_ids: dict[str, int],
):
    created = 0
    skipped = 0

    for item in PRODUCTS:
        category_id = category_ids[item["category"]]
        brand_id = brand_ids[item["brand"]]
        exists = (
            db.query(Product.id)
            .filter(
                Product.name_en == item["name_en"],
                Product.brand_id == brand_id,
            )
            .first()
        )

        if exists:
            skipped += 1
            continue

        product_service.create_product(
            db,
            _product_data(item, category_id, brand_id),
            commit=False,
        )
        created += 1

    return {"created": created, "skipped": skipped}


def seed_static_data(db: Session) -> dict[str, dict[str, int]]:
    try:
        category_ids, category_counts = _seed_categories(db)
        brand_ids, brand_counts = _seed_brands(db)
        _, area_counts = _seed_delivery_areas(db)
        product_counts = _seed_products(db, category_ids, brand_ids)
        db.commit()
        return {
            "categories": category_counts,
            "brands": brand_counts,
            "delivery areas": area_counts,
            "products": product_counts,
        }
    except Exception:
        db.rollback()
        raise


def _print_summary(summary: dict[str, dict[str, int]]) -> None:
    print("Static data seed complete.")
    for label, counts in summary.items():
        print(
            f"  {label}: {counts['created']} created, "
            f"{counts['skipped']} already present"
        )


def main() -> int:
    db = SessionLocal()

    try:
        summary = seed_static_data(db)
    except HTTPException as exc:
        db.rollback()
        print(f"Seed failed: {exc.detail}")
        return 1
    except Exception as exc:
        db.rollback()
        print(f"Seed failed: {exc}")
        return 1
    finally:
        db.close()

    _print_summary(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
