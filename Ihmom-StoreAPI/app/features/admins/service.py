
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import security
from app.features.admins.model import Admin
from app.features.admins.schema import AdminCreate, AdminQuery, AdminSortBy
from app.shared import crud
from app.constants.query import SortDirection
from app.shared.search import ilike_any
from app.shared.sorting import build_order_by


def create_admin(db: Session, admin_data: AdminCreate):
    username = admin_data.username.strip()
    email = str(admin_data.email).lower()

    existing_username = (
        db.query(Admin).filter(Admin.username == username).first()
    )
    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    existing_email = db.query(Admin).filter(Admin.email == email).first()
    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email already exists",
        )

    admin = Admin(
        username=username,
        email=email,
        hashed_password=security.hash_password(admin_data.password),
    )

    try:
        return crud.create(db, admin)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists",
        ) from exc


def get_admins(db: Session, query: AdminQuery):
    admins_query = db.query(Admin)

    search_filter = ilike_any([Admin.username, Admin.email], query.search)
    if search_filter is not None:
        admins_query = admins_query.filter(search_filter)

    sort_columns = {
        AdminSortBy.ID: Admin.id,
        AdminSortBy.USERNAME: Admin.username,
        AdminSortBy.CREATED_AT_UTC: Admin.created_at,
    }

    sort_by = query.sort_by
    sort_column = sort_columns[sort_by] if sort_by is not None else Admin.id

    return crud.paginate(
        admins_query,
        query.page,
        query.page_size,
        order_by=build_order_by(
            sort_column,
            query.order or SortDirection.ASC,
            Admin.id,
            sort_is_id=sort_by is None or sort_by == AdminSortBy.ID,
            tie_order=SortDirection.ASC,
        ),
    )


def get_admin(db: Session, admin_id: int):
    return crud.get_or_404(db, Admin, admin_id, detail="Admin not found")


def delete_admin(
    db: Session,
    admin_id: int,
    current_admin_id: int,
) -> None:
    if admin_id == current_admin_id:
        raise HTTPException(
            status_code=409,
            detail="Administrators cannot delete their own accounts",
        )

    # Lock every admin in a stable order so concurrent delete requests cannot
    # both pass the last-admin check using the same stale count.
    admins = (
        db.query(Admin)
        .order_by(Admin.id)
        .with_for_update()
        .all()
    )
    admin = next((item for item in admins if item.id == admin_id), None)

    if not admin:
        raise HTTPException(
            status_code=404,
            detail="Admin not found",
        )

    if len(admins) <= 1:
        raise HTTPException(
            status_code=409,
            detail="The last admin account cannot be deleted",
        )

    try:
        db.delete(admin)
        db.commit()
    except Exception:
        db.rollback()
        raise
