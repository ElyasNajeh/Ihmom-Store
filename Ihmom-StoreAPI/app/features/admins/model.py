from sqlalchemy import Column, String

from app.constants.admins import (
    ADMIN_EMAIL_MAX_LENGTH,
    ADMIN_PASSWORD_HASH_MAX_LENGTH,
    ADMIN_USERNAME_MAX_LENGTH,
)
from app.db.base import Base
from app.db.mixins import BigIntIdMixin, CreatedAtMixin


class Admin(BigIntIdMixin, CreatedAtMixin, Base):
    __tablename__ = "admins"

    username = Column(
        String(ADMIN_USERNAME_MAX_LENGTH),
        unique=True,
        nullable=False,
    )

    email = Column(
        String(ADMIN_EMAIL_MAX_LENGTH),
        unique=True,
        nullable=False,
    )

    hashed_password = Column(
        String(ADMIN_PASSWORD_HASH_MAX_LENGTH),
        nullable=False,
    )
