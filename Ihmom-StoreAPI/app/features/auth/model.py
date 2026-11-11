from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.mixins import CreatedAtMixin


class AdminSession(CreatedAtMixin, Base):
    __tablename__ = "admin_sessions"
    __table_args__ = (
        Index("ix_admin_sessions_admin_id", "admin_id"),
        Index("ix_admin_sessions_expires_at", "expires_at"),
        Index("ix_admin_sessions_revoked_at", "revoked_at"),
    )

    session_id = Column(String(36), primary_key=True)
    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
    )
    refresh_token_hash = Column(String(64), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    rotated_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    admin = relationship("Admin", back_populates="sessions")
