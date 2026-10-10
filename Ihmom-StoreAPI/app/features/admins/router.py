from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins import service
from app.features.admins.model import Admin
from app.features.admins.schema import AdminCreate, AdminResponse
from app.shared.schema import PageResponse

router = APIRouter(
    prefix="/admins",
    tags=["Admins"],
)


@router.post(
    "/",
    response_model=AdminResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin(
    admin_data: AdminCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_admin(db, admin_data)


@router.get("/", response_model=PageResponse[AdminResponse])
def get_admins(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_admins(db, page, page_size)


@router.get("/{admin_id}", response_model=AdminResponse)
def get_admin(
    admin_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_admin(db, admin_id)


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin(
    admin_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_admin(db, admin_id, current_admin.id)
