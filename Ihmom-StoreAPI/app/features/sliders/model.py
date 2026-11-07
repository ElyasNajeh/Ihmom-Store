from sqlalchemy import Boolean, Column, Integer, String, true

from app.constants.images import IMAGE_PATH_MAX_LENGTH
from app.constants.sliders import (
    SLIDER_DEFAULT_DISPLAY_ORDER,
    SLIDER_TITLE_MAX_LENGTH,
)
from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin


class Sliders(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "sliders"

    title_ar = Column(
        String(SLIDER_TITLE_MAX_LENGTH),
        nullable=False,
    )

    title_en = Column(
        String(SLIDER_TITLE_MAX_LENGTH),
        nullable=False,
    )

    display_order = Column(
        Integer,
        default=SLIDER_DEFAULT_DISPLAY_ORDER,
        server_default=str(SLIDER_DEFAULT_DISPLAY_ORDER),
        nullable=False,
    )

    is_active = Column(
        Boolean,
        default=True,
        server_default=true(),
        nullable=False,
    )

    image = Column(
        String(IMAGE_PATH_MAX_LENGTH),
        nullable=False,
    )
