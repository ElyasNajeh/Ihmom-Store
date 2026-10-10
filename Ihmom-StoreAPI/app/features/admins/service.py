from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import security
from app.features.admins.model import Admin
from app.features.admins.schema import AdminCreate
from app.shared import crud


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


def get_admins(db: Session, page: int, page_size: int):
    return crud.paginate(
        db.query(Admin),
        page,
        page_size,
        order_by=(Admin.id,),
    )


def get_admin(db: Session, admin_id: int):
    admin = crud.get_by_id(db, Admin, admin_id)
    if not admin:
        raise HTTPException(
            status_code=404,
            detail="Admin not found",
        )
    return admin


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
