"""
Redis-based rolling-window rate limiter.

Implements a sorted-set sliding window: for each IP we keep a ZSET of
request timestamps. On every check we drop entries older than the window,
count what's left, and reject if the count is already at the limit.
This is more accurate than a fixed bucket (no "burst at window boundary"
problem) and is O(log n) per request.
"""
import time

from redis.asyncio import Redis

from src.config.settings import settings
from src.utils.exceptions import RateLimitExceededError
from src.utils.logger import get_logger

logger = get_logger(__name__)

RATE_LIMIT_KEY_PREFIX = "ratelimit:orders:"


async def enforce_order_rate_limit(redis_client: Redis, ip_address: str) -> None:
    """
    Enforces: max `ORDER_RATE_LIMIT_MAX` POST /api/orders requests per IP
    per rolling `ORDER_RATE_LIMIT_WINDOW_SECONDS` window.

    Raises RateLimitExceededError (-> HTTP 429) if the limit is breached.
    """
    key = f"{RATE_LIMIT_KEY_PREFIX}{ip_address}"
    now = time.time()
    window_start = now - settings.ORDER_RATE_LIMIT_WINDOW_SECONDS

    async with redis_client.pipeline(transaction=True) as pipe:
        pipe.zremrangebyscore(key, 0, window_start)  # drop expired entries
        pipe.zcard(key)                               # count remaining
        pipe.zadd(key, {str(now): now})                # tentatively record this request
        pipe.expire(key, settings.ORDER_RATE_LIMIT_WINDOW_SECONDS)
        _, current_count, _, _ = await pipe.execute()

    if current_count >= settings.ORDER_RATE_LIMIT_MAX:
        # Undo the tentative add since this request is being rejected.
        await redis_client.zrem(key, str(now))
        logger.warning("Rate limit exceeded for IP %s (%s requests)", ip_address, current_count)
        raise RateLimitExceededError(
            f"Too many order requests. Maximum {settings.ORDER_RATE_LIMIT_MAX} orders "
            f"per {settings.ORDER_RATE_LIMIT_WINDOW_SECONDS // 60} minutes allowed per IP."
        )
