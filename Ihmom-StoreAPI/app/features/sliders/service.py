
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.features.sliders.model import Sliders
from app.features.sliders.schema import (
    SliderCreate,
    SliderQuery,
    SliderSortBy,
    SliderUpdate,
)
from app.shared import crud
from app.constants.images import SLIDER_IMAGE_SUBDIRECTORY
from app.constants.query import SortDirection
from app.shared.image_cleanup import delete_unused_uploaded_image
from app.shared.images import delete_uploaded_image, optimize_slider_upload
from app.shared.search import ilike_any
from app.shared.sorting import build_order_by


SORTABLE_FIELDS = {
    SliderSortBy.ID: Sliders.id,
    SliderSortBy.CREATED_AT: Sliders.created_at,
    SliderSortBy.DISPLAY_ORDER: Sliders.display_order,
    SliderSortBy.TITLE_AR: Sliders.title_ar,
    SliderSortBy.TITLE_EN: Sliders.title_en,
}


def _save_slider_image(file: UploadFile) -> str:
    filename = optimize_slider_upload(file)
    return f"/uploads/{SLIDER_IMAGE_SUBDIRECTORY}/{filename}"


def get_sliders(
    db: Session,
    query: SliderQuery,
    is_admin: bool,
):
    sliders_query = db.query(Sliders)

    if query.search:
        search_filter = ilike_any(
            [Sliders.title_ar, Sliders.title_en],
            query.search,
        )
        if search_filter is not None:
            sliders_query = sliders_query.filter(search_filter)

    if not is_admin:
        sliders_query = sliders_query.filter(
            Sliders.is_active.is_(True)
        )
    elif query.filter and query.filter.is_active is not None:
        sliders_query = sliders_query.filter(
            Sliders.is_active.is_(query.filter.is_active)
        )

    if query.filter and query.filter.display_order is not None:
        sliders_query = sliders_query.filter(
            Sliders.display_order == query.filter.display_order
        )

    sort_by = query.sort_by or SliderSortBy.DISPLAY_ORDER
    order = query.order or SortDirection.ASC

    return crud.paginate(
        sliders_query,
        query.page,
        query.page_size,
        order_by=build_order_by(
            SORTABLE_FIELDS[sort_by],
            order,
            Sliders.id,
            sort_is_id=sort_by == SliderSortBy.ID,
        ),
    )


def create_slider(
    db: Session,
    slider_data: SliderCreate,
    file: UploadFile,
):
    image = _save_slider_image(file)
    slider = Sliders(**slider_data.model_dump(), image=image)
    db.add(slider)

    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_uploaded_image(image, SLIDER_IMAGE_SUBDIRECTORY)
        raise

    db.refresh(slider)
    return slider


def get_slider(
    db: Session,
    slider_id: int,
    is_admin: bool,
):
    slider_query = db.query(Sliders).filter(
        Sliders.id == slider_id
    )

    if not is_admin:
        slider_query = slider_query.filter(
            Sliders.is_active.is_(True)
        )

    slider = slider_query.first()

    if not slider:
        raise HTTPException(
            status_code=404,
            detail="Slider not found",
        )

    return slider


def update_slider(
    db: Session,
    slider_id: int,
    slider_data: SliderUpdate,
):
    slider = crud.get_or_404(db, Sliders, slider_id, detail="Slider not found")

    data = slider_data.model_dump(exclude_unset=True)
    if not data:
        return slider

    try:
        return crud.update_by_id(
            db,
            Sliders,
            slider_id,
            data,
            db_obj=slider,
        )
    except Exception:
        db.rollback()
        raise


def replace_slider_image(
    db: Session,
    slider_id: int,
    file: UploadFile,
):
    slider = crud.get_or_404(db, Sliders, slider_id, detail="Slider not found")

    new_image = _save_slider_image(file)
    old_image = slider.image
    slider.image = new_image

    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_uploaded_image(new_image, SLIDER_IMAGE_SUBDIRECTORY)
        raise

    db.refresh(slider)
    delete_unused_uploaded_image(
        db,
        Sliders.image,
        old_image,
        SLIDER_IMAGE_SUBDIRECTORY,
    )
    return slider


def delete_slider(db: Session, slider_id: int) -> None:
    slider = crud.get_or_404(db, Sliders, slider_id, detail="Slider not found")

    image = slider.image

    try:
        db.delete(slider)
        db.commit()
    except Exception:
        db.rollback()
        raise

    delete_unused_uploaded_image(
        db,
        Sliders.image,
        image,
        SLIDER_IMAGE_SUBDIRECTORY,
    )
