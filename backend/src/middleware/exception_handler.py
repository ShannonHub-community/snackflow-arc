"""
Centralized exception handling.

Route handlers and services raise domain exceptions (see
`utils/exceptions.py`) or let unexpected errors bubble up; this module
translates all of them into a consistent JSON error envelope with the
correct HTTP status code, and ensures nothing leaks internal stack traces
to clients in production.
"""
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.config.settings import settings
from src.utils.exceptions import SnackFlowException
from src.utils.logger import get_logger

logger = get_logger(__name__)


def _error_body(error_code: str, message: str) -> dict:
    return {"success": False, "error_code": error_code, "message": message}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(SnackFlowException)
    async def snackflow_exception_handler(request: Request, exc: SnackFlowException):
        logger.warning("Domain error [%s] on %s %s: %s", exc.error_code, request.method, request.url.path, exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.error_code, exc.message),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.info("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
        # Pydantic v2 error dicts can include a "ctx" key holding the raw
        # exception instance (e.g. the ValueError from a @field_validator),
        # which json.dumps cannot serialize. Strip it, then safely encode
        # the rest (jsonable_encoder handles remaining edge cases).
        raw_errors = exc.errors()
        for err in raw_errors:
            err.pop("ctx", None)
        safe_errors = jsonable_encoder(raw_errors)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body("VALIDATION_ERROR", "Request validation failed. See 'errors' for details.")
            | {"errors": safe_errors},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        message = str(exc) if settings.DEBUG else "An unexpected error occurred."
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body("INTERNAL_ERROR", message),
        )
