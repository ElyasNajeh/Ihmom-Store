
from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, Path, Query, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.security import get_current_admin, get_optional_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.sliders import service
from app.features.sliders.schema import (
    SliderCreate,
    SliderListResponse,
    SliderQuery,
    SliderResponse,
    SliderUpdate, SliderSortBy,
)
from app.shared.query import QueryRules, parse_query


router = APIRouter(prefix="/sliders", tags=["Sliders"])


def validate_slider_query(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1),
    search: str | None = Query(None),
    is_active: bool | None = Query(None, alias="filter[is_active]"),
    display_order: int | None = Query(None, alias="filter[display_order]"),
    sort_by: SliderSortBy | None = Query(None),
    order: str | None = Query(None),
) -> SliderQuery:
    return parse_query(
        request,
        SliderQuery,
        values={
            "page": page,
            "page_size": page_size,
            "search": search,
            "sort_by": sort_by,
            "order": order,
        },
        filters={"is_active": is_active, "display_order": display_order},
        rules=QueryRules.create(
            declared={
                "page",
                "page_size",
                "search",
                "filter[is_active]",
                "filter[display_order]",
                "sort_by",
                "order",
            },
            filter_fields={"is_active", "display_order"},
        ),
    )

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
def get_sliders(
    query: Annotated[SliderQuery, Depends(validate_slider_query)],
    db: Session = Depends(get_db),
    current_admin: Admin | None = Depends(get_optional_current_admin),
):
    return service.get_sliders(
        db,
        query,
        is_admin=current_admin is not None,
    )


@router.get("/{slider_id}", response_model=SliderResponse)
def get_slider(
    slider_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin | None = Depends(get_optional_current_admin),
):
    return service.get_slider(
        db,
        slider_id,
        is_admin=current_admin is not None,
    )


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


@router.delete(
    "/{slider_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_slider(
    slider_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    service.delete_slider(db, slider_id)
