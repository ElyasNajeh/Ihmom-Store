from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.features.sliders.model import Slider
from app.features.sliders.schema import SliderCreate, SliderUpdate
from app.shared import crud
from app.shared.image_cleanup import delete_unused_uploaded_image
from app.shared.images import delete_uploaded_image, optimize_slider_upload


SORTABLE_FIELDS = {
    "id": Slider.id,
    "created_at": Slider.created_at,
    "display_order": Slider.display_order,
    "title_ar": Slider.title_ar,
    "title_en": Slider.title_en,
}


def _save_slider_image(file: UploadFile) -> str:
    filename = optimize_slider_upload(file)
    return f"/uploads/sliders/{filename}"


def _list_sliders(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    is_active: bool | None,
):
    query = db.query(Slider)

    if search and search.strip():
        escaped_search = (
            search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        term = f"%{escaped_search}%"
        query = query.filter(
            Slider.title_ar.ilike(term, escape="\\")
            | Slider.title_en.ilike(term, escape="\\")
        )

    if is_active is not None:
        query = query.filter(Slider.is_active.is_(is_active))

    sort_column = SORTABLE_FIELDS[sort_by]
    order_method = sort_column.asc if sort_order == "asc" else sort_column.desc
    id_order_method = Slider.id.asc if sort_order == "asc" else Slider.id.desc
    order_by = [order_method()]
    if sort_by != "id":
        order_by.append(id_order_method())

    return crud.paginate(query, page, page_size, order_by=order_by)


def create_slider(
    db: Session,
    slider_data: SliderCreate,
    file: UploadFile,
):
    image = _save_slider_image(file)
    slider = Slider(**slider_data.model_dump(), image=image)
    db.add(slider)

    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_uploaded_image(image, "sliders")
        raise

    db.refresh(slider)
    return slider


def get_active_sliders(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
):
    return _list_sliders(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
        is_active=True,
    )


def get_sliders(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    is_active: bool | None,
    sort_by: str,
    sort_order: str,
):
    return _list_sliders(
        db,
        page,
        page_size,
        search,
        sort_by,
        sort_order,
        is_active,
    )


def get_slider(db: Session, slider_id: int):
    slider = crud.get_by_id(db, Slider, slider_id)
    if not slider:
        raise HTTPException(status_code=404, detail="Slider not found")
    return slider


def get_active_slider(db: Session, slider_id: int):
    slider = (
        db.query(Slider)
        .filter(Slider.id == slider_id, Slider.is_active.is_(True))
        .first()
    )
    if not slider:
        raise HTTPException(status_code=404, detail="Slider not found")
    return slider


def update_slider(
    db: Session,
    slider_id: int,
    slider_data: SliderUpdate,
):
    slider = crud.get_by_id(db, Slider, slider_id)
    if not slider:
        raise HTTPException(status_code=404, detail="Slider not found")

    data = slider_data.model_dump(exclude_unset=True)
    if not data:
        return slider

    try:
        return crud.update_by_id(
            db,
            Slider,
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
    slider = crud.get_by_id(db, Slider, slider_id)
    if not slider:
        raise HTTPException(status_code=404, detail="Slider not found")

    new_image = _save_slider_image(file)
    old_image = slider.image
    slider.image = new_image

    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_uploaded_image(new_image, "sliders")
        raise

    db.refresh(slider)
    delete_unused_uploaded_image(db, Slider.image, old_image, "sliders")
    return slider


def delete_slider(db: Session, slider_id: int) -> None:
    slider = crud.get_by_id(db, Slider, slider_id)
    if not slider:
        raise HTTPException(status_code=404, detail="Slider not found")

    image = slider.image
    try:
        db.delete(slider)
        db.commit()
    except Exception:
        db.rollback()
        raise

    delete_unused_uploaded_image(db, Slider.image, image, "sliders")
