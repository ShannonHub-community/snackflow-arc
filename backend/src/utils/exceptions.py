"""
Custom domain exceptions.

Services raise these instead of HTTPException directly, which keeps the
service layer transport-agnostic (no FastAPI import needed) and lets
`middleware/exception_handler.py` translate them into consistent JSON
error responses in one place.
"""


class SnackFlowException(Exception):
    """Base class for all domain exceptions."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, *, error_code: str | None = None):
        self.message = message
        if error_code:
            self.error_code = error_code
        super().__init__(message)


class NotFoundError(SnackFlowException):
    status_code = 404
    error_code = "NOT_FOUND"


class ValidationError(SnackFlowException):
    status_code = 422
    error_code = "VALIDATION_ERROR"


class ConflictError(SnackFlowException):
    """Used for the Cash Lock and other state-conflict situations."""

    status_code = 409
    error_code = "CONFLICT"


class RateLimitExceededError(SnackFlowException):
    status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"


class PaymentError(SnackFlowException):
    status_code = 402
    error_code = "PAYMENT_ERROR"


class UnauthorizedError(SnackFlowException):
    status_code = 401
    error_code = "UNAUTHORIZED"


class StoreClosedError(SnackFlowException):
    status_code = 400
    error_code = "STORE_CLOSED"
