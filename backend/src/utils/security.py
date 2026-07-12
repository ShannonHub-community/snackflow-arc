"""
Security helper functions:
  - Simple header-based admin authentication for staff/kitchen routes
    (menu CUD, store status PATCH, order status updates).
  - HMAC signature verification for Razorpay webhooks.
"""
from __future__ import annotations

import hashlib
import hmac

from fastapi import Header, HTTPException, status

from src.config.settings import settings


def verify_admin_key(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    """
    Dependency used to protect staff-only endpoints (menu management,
    store status toggling, manual order status changes, refunds).

    In production this should be swapped for real JWT/OAuth staff auth;
    a shared secret header is a pragmatic MVP approach.
    """
    if not hmac.compare_digest(x_admin_key, settings.ADMIN_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin credentials",
        )


def verify_razorpay_signature(body: bytes, signature: str, secret: str) -> bool:
    """
    Verify Razorpay webhook payload signature.

    Razorpay signs the raw request body with HMAC-SHA256 using the webhook
    secret configured in the Razorpay dashboard. We must verify against the
    RAW bytes (not a re-serialized JSON) or the signature will never match.
    """
    if not signature:
        return False
    expected = hmac.new(
        key=secret.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
