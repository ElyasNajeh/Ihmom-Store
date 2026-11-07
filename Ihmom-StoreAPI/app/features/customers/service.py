
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.customers.model import Customer
from app.features.customers.schema import (
    CustomerCreate,
    CustomerQuery,
    CustomerSortBy,
    CustomerUpdate,
)
from app.features.orders.model import Order
from app.shared import crud
from app.constants.query import SortDirection
from app.shared.phone import normalize_phone, phone_identity
from app.shared.search import ilike_any, like_pattern
from app.shared.sorting import build_order_by


SORTABLE_FIELDS = {
    CustomerSortBy.ID: Customer.id,
    CustomerSortBy.CREATED_AT: Customer.created_at,
    CustomerSortBy.NAME: Customer.name,
}


def _normalize_name(name: str) -> str:
    value = name.strip()
    if not value:
        raise HTTPException(status_code=422, detail="Customer name cannot be empty")
    if len(value) > 150:
        raise HTTPException(
            status_code=422,
            detail="Customer name cannot exceed 150 characters",
        )
    return value


def find_customer_by_phone(
    db: Session,
    phone: str,
    *,
    exclude_customer_id: int | None = None,
):
    identity = phone_identity(phone)
    query = db.query(Customer).filter(Customer.phone == identity)
    if exclude_customer_id is not None:
        query = query.filter(Customer.id != exclude_customer_id)
    return query.order_by(Customer.id.asc()).first()


def create_customer(db: Session, customer_data: CustomerCreate):
    phone = normalize_phone(customer_data.phone)
    name = _normalize_name(customer_data.name)
    if find_customer_by_phone(db, phone):
        raise HTTPException(
            status_code=409,
            detail="A customer with this phone number already exists",
        )

    customer = Customer(phone=phone, name=name)
    try:
        return crud.create(db, customer)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A customer with this phone number already exists",
        ) from exc


def get_customers(db: Session, query_data: CustomerQuery):
    query = db.query(Customer)

    if query_data.search:
        search_text = query_data.search
        search_filters = [ilike_any([Customer.name, Customer.phone], search_text)]
        try:
            normalized_phone = normalize_phone(search_text)
        except ValueError:
            normalized_phone = None
        if normalized_phone and normalized_phone != search_text:
            normalized_term = like_pattern(normalized_phone)
            if normalized_term is not None:
                search_filters.append(
                    Customer.phone.ilike(normalized_term, escape="\\")
                )
        query = query.filter(or_(*search_filters))

    if query_data.filter:
        filters = query_data.filter

        if filters.created_at_from is not None:
            query = query.filter(
                Customer.created_at >= filters.created_at_from
            )

        if filters.created_at_to is not None:
            query = query.filter(
                Customer.created_at <= filters.created_at_to
            )

    sort_by = query_data.sort_by or CustomerSortBy.CREATED_AT
    order = query_data.order or SortDirection.DESC

    return crud.paginate(
        query,
        query_data.page,
        query_data.page_size,
        order_by=build_order_by(
            SORTABLE_FIELDS[sort_by],
            order,
            Customer.id,
            sort_is_id=sort_by == CustomerSortBy.ID,
        ),
    )


def get_customer(db: Session, customer_id: int):
    return crud.get_or_404(db, Customer, customer_id, detail="Customer not found")


def update_customer(
    db: Session,
    customer_id: int,
    customer_data: CustomerUpdate,
):
    customer = crud.get_or_404(
        db,
        Customer,
        customer_id,
        detail="Customer not found",
    )

    data = customer_data.model_dump(exclude_unset=True)
    if "name" in data:
        data["name"] = _normalize_name(data["name"])
    if "phone" in data:
        data["phone"] = normalize_phone(data["phone"])
        if find_customer_by_phone(
            db,
            data["phone"],
            exclude_customer_id=customer_id,
        ):
            raise HTTPException(
                status_code=409,
                detail="A customer with this phone number already exists",
            )

    if not data:
        return customer

    try:
        return crud.update_by_id(
            db,
            Customer,
            customer_id,
            data,
            db_obj=customer,
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A customer with this phone number already exists",
        ) from exc
    except Exception:
        db.rollback()
        raise


def delete_customer(db: Session, customer_id: int) -> None:
    customer = crud.get_or_404(
        db,
        Customer,
        customer_id,
        detail="Customer not found",
    )

    if db.query(Order.id).filter(Order.customer_id == customer_id).first():
        raise HTTPException(
            status_code=409,
            detail="Customer cannot be deleted while referenced by orders",
        )

    try:
        db.delete(customer)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Customer cannot be deleted while referenced by orders",
        ) from exc
    except Exception:
        db.rollback()
        raise


def get_or_create_customer(db: Session, phone: str, name: str):
    """Return a normalized customer without committing the caller's transaction."""
    phone = normalize_phone(phone)
    name = _normalize_name(name)

    customer = find_customer_by_phone(db, phone)
    if customer:
        if customer.name != name:
            customer.name = name
        return customer

    customer = Customer(phone=phone, name=name)
    try:
        with db.begin_nested():
            db.add(customer)
            db.flush()
        return customer
    except IntegrityError:
        customer = find_customer_by_phone(db, phone)
        if not customer:
            raise
        if customer.name != name:
            customer.name = name
        return customer
