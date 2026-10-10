from sqlalchemy import func
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.shared.images import delete_uploaded_image, resolve_uploaded_image, upload_url


def delete_unused_uploaded_image(
    db: Session,
    image_column: InstrumentedAttribute,
    value: str | None,
    subdirectory: str,
) -> None:
    """After committing a change, delete its old upload if no records still use it.

    Each resource validates uploads against its own directory. Pass that
    resource's image column; inactive records also count as references.
    """
    path = resolve_uploaded_image(value, subdirectory)
    if path is None:
        return

    # Support both current upload URLs and legacy relative paths/filenames.
    relative_url = upload_url(path).lstrip("/")
    directory_path = relative_url.removeprefix("uploads/")
    filename = path.name
    references = {relative_url, directory_path}
    if directory_path == f"{subdirectory}/{filename}":
        references.add(filename)

    normalized_image = func.ltrim(func.replace(image_column, "\\", "/"), "/")
    still_in_use = (
        db.query(image_column)
        .filter(normalized_image.in_(references))
        .first()
    )
    if still_in_use is None:
        delete_uploaded_image(value, subdirectory)
