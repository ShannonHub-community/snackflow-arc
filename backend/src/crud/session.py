import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.crud.base import CRUDBase
from src.models.session import Session


class CRUDSession(CRUDBase[Session]):
    async def get_or_create(
        self, db: AsyncSession, session_uuid: uuid.UUID, table_number: str | None = None
    ) -> Session:
        session_obj = await db.get(Session, session_uuid)
        if session_obj is None:
            session_obj = Session(
                session_uuid=session_uuid,
                table_number=table_number,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_TTL_HOURS),
                is_active=True,
            )
            db.add(session_obj)
            await db.flush()
            await db.refresh(session_obj)
        return session_obj

    async def get_expired(self, db: AsyncSession) -> list[Session]:
        result = await db.execute(
            select(Session).where(Session.expires_at < datetime.now(timezone.utc))
        )
        return list(result.scalars().all())


session_crud = CRUDSession(Session)
