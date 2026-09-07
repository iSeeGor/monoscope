from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from apps.api.monoscope_api.schemas import ErrorBody, ErrorResponse
from monoscope.monobank import (
    MonobankError,
    MonobankRateLimitError,
    MonobankUnauthorizedError,
)
from monoscope.rates import RateLookupError

logger = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(
        MonobankUnauthorizedError,
        _monobank_unauthorized_handler,
    )
    app.add_exception_handler(MonobankRateLimitError, _monobank_rate_handler)
    app.add_exception_handler(MonobankError, _monobank_error_handler)
    app.add_exception_handler(RateLookupError, _rate_error_handler)
    app.add_exception_handler(Exception, _unexpected_error_handler)


async def _api_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, ApiError)
    return _response(
        request,
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )


async def _validation_error_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    return _response(
        request,
        status_code=422,
        code="REQUEST_SCHEMA_INVALID",
        message="Request validation failed.",
    )


async def _monobank_unauthorized_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    return _response(
        request,
        status_code=401,
        code="MONOBANK_UNAUTHORIZED",
        message="Monobank rejected the configured token.",
    )


async def _monobank_rate_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    return _response(
        request,
        status_code=429,
        code="MONOBANK_RATE_LIMITED",
        message="Monobank request limit reached. Wait 60 seconds and retry.",
    )


async def _monobank_error_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    return _response(
        request,
        status_code=502,
        code="MONOBANK_UNAVAILABLE",
        message="Could not load data from Monobank.",
    )


async def _rate_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return _response(
        request,
        status_code=502,
        code="RATE_UNAVAILABLE",
        message="Could not resolve an exchange rate for this report.",
    )


async def _unexpected_error_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception(
        "Unexpected API error",
        extra={"request_id": _request_id(request)},
    )
    return _response(
        request,
        status_code=500,
        code="INTERNAL_ERROR",
        message="An unexpected error occurred.",
    )


def _response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> JSONResponse:
    payload = ErrorResponse(
        error=ErrorBody(
            code=code,
            message=message,
            request_id=_request_id(request),
            details=details,
        )
    )
    return JSONResponse(
        status_code=status_code,
        content=payload.model_dump(mode="json", by_alias=True, exclude_none=True),
    )


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")
