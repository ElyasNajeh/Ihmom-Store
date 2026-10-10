from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, Path, Query, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.sliders import service
from app.features.sliders.schema import (
    SliderCreate,
    SliderListResponse,
    SliderResponse,
    SliderUpdate,
)

router = APIRouter(prefix="/sliders", tags=["Sliders"])


def _slider_create_form(
    title_ar: Annotated[str, Form()],
    title_en: Annotated[str, Form()],
    display_order: Annotated[int, Form()] = 0,
    is_active: Annotated[bool, Form()] = True,
) -> SliderCreate:
    try:
        return SliderCreate(
            title_ar=title_ar,
            title_en=title_en,
            display_order=display_order,
            is_active=is_active,
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc


@router.get("/", response_model=SliderListResponse)
def get_active_sliders(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    sort_by: Literal[
        "id",
        "created_at",
        "display_order",
        "title_ar",
        "title_en",
    ] = Query("display_order"),
    sort_order: Literal["asc", "desc"] = Query("asc"),
    db: Session = Depends(get_db),
):
    return service.get_active_sliders(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
    )


@router.get("/admin/all", response_model=SliderListResponse)
def get_sliders(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    is_active: bool | None = Query(None),
    sort_by: Literal[
        "id",
        "created_at",
        "display_order",
        "title_ar",
        "title_en",
    ] = Query("created_at"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_sliders(
        db,
        page,
        page_size,
        search,
        is_active,
        sort_by,
        sort_order,
    )


@router.get("/admin/{slider_id}", response_model=SliderResponse)
def get_slider_for_admin(
    slider_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_slider(db, slider_id)


@router.post(
    "/",
    response_model=SliderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_slider(
    slider_data: SliderCreate = Depends(_slider_create_form),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.create_slider(db, slider_data, image)


@router.get("/{slider_id}", response_model=SliderResponse)
def get_active_slider(
    slider_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
):
    return service.get_active_slider(db, slider_id)


@router.patch("/{slider_id}", response_model=SliderResponse)
def update_slider(
    slider_id: Annotated[int, Path(ge=1)],
    slider_data: SliderUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.update_slider(db, slider_id, slider_data)


@router.patch("/{slider_id}/image", response_model=SliderResponse)
def replace_slider_image(
    slider_id: Annotated[int, Path(ge=1)],
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.replace_slider_image(db, slider_id, image)


@router.delete("/{slider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slider(
    slider_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_slider(db, slider_id)
