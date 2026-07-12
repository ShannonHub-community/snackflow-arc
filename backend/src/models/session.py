"""
Session: represents a customer's QR-scan session at a table. The
`session_uuid` is generated client-side (or by a `/api/session` endpoint,
out of scope here) and passed by the frontend on every order/websocket call.
It is the identity used for the Cash Lock and for targeted WebSocket
notifications.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base, TimestampMixin


class Session(Base, TimestampMixin):
    __tablename__ = "sessions"

    session_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    table_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    orders: Mapped[list["Order"]] = relationship(back_populates="session")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Session {self.session_uuid} active={self.is_active}>"
