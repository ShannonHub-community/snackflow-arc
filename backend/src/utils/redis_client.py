"""
Async Redis client singleton.

Used for:
  - IP-based rate limiting on POST /api/orders
  - Cash-lock fast lookup (Session_UUID -> active UNPAID_CASH order)
  - Ephemeral queue/session cache cleared by the nightly scheduler job
"""
from __future__ import annotations

import redis.asyncio as redis

from src.config.settings import settings
from src.utils.logger import get_logger

logger = get_logger(__name__)

_redis_pool: redis.Redis | None = None


def get_redis() -> redis.Redis:
    """Return a process-wide Redis connection (lazy singleton)."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        logger.info("Redis client initialized")
    return _redis_pool


async def close_redis() -> None:
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.close()
        _redis_pool = None
        logger.info("Redis client closed")
