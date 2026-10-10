from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.customers.model import Customer
from app.features.customers.schema import CustomerCreate, CustomerUpdate
from app.features.orders.model import Order
from app.shared import crud
from app.shared.phone import normalize_phone, phone_identity


SORTABLE_FIELDS = {
    "id": Customer.id,
    "created_at": Customer.created_at,
    "name": Customer.name,
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


def _escape_search(value: str) -> str:
    return (
        value.strip()
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )


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


def get_customers(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
):
    query = db.query(Customer)
    if search and search.strip():
        search_text = search.strip()
        term = f"%{_escape_search(search_text)}%"
        search_filters = [
            Customer.name.ilike(term, escape="\\"),
            Customer.phone.ilike(term, escape="\\"),
        ]
        try:
            normalized_phone = normalize_phone(search_text)
        except ValueError:
            normalized_phone = None
        if normalized_phone and normalized_phone != search_text:
            normalized_term = f"%{_escape_search(normalized_phone)}%"
            search_filters.append(
                Customer.phone.ilike(normalized_term, escape="\\")
            )
        query = query.filter(or_(*search_filters))

    sort_column = SORTABLE_FIELDS[sort_by]
    order_method = sort_column.asc if sort_order == "asc" else sort_column.desc
    id_order_method = Customer.id.asc if sort_order == "asc" else Customer.id.desc
    order_by = [order_method()]
    if sort_by != "id":
        order_by.append(id_order_method())

    return crud.paginate(query, page, page_size, order_by=order_by)


def get_customer(db: Session, customer_id: int):
    customer = crud.get_by_id(db, Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


def update_customer(
    db: Session,
    customer_id: int,
    customer_data: CustomerUpdate,
):
    customer = crud.get_by_id(db, Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

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
    customer = crud.get_by_id(db, Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

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
