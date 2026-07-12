"""
Rate limiting dependency for POST /api/orders.

Implemented as a FastAPI dependency (rather than raw ASGI middleware) so
it can be applied selectively to just the order-creation route, and so it
can cleanly access Depends(get_redis) and raise domain exceptions that
flow through the centralized exception handler.
"""
from fastapi import Request

from src.services.rate_limiter_service import enforce_order_rate_limit
from src.utils.redis_client import get_redis


def _extract_client_ip(request: Request) -> str:
    """
    Prefer X-Forwarded-For (set by reverse proxies / load balancers such as
    Render, Railway, or an Nginx front) since request.client.host would
    otherwise always be the proxy's own IP.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def order_rate_limit_dependency(request: Request) -> None:
    redis_client = get_redis()
    ip_address = _extract_client_ip(request)
    await enforce_order_rate_limit(redis_client, ip_address)
