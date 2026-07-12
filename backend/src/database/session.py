"""
Async SQLAlchemy engine + session factory.

Exposes `get_db`, a FastAPI dependency that yields an AsyncSession and
guarantees rollback-on-error / close-on-exit semantics.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.config.settings import settings
from src.utils.logger import get_logger

logger = get_logger(__name__)


# Use psycopg3 async driver instead of asyncpg
DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql+asyncpg://",
    "postgresql+psycopg://",
).replace(
    "postgresql://",
    "postgresql+psycopg://",
)


engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a transactional AsyncSession."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()