from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from apps.api.monoscope_api.cache import ReportCache
from apps.api.monoscope_api.errors import register_exception_handlers
from apps.api.monoscope_api.routers.health import router as health_router
from apps.api.monoscope_api.routers.reports import router as reports_router
from apps.api.monoscope_api.settings import Settings
from monoscope import __version__
from monoscope.monobank import MonobankClient
from monoscope.rates import RateLookup
from monoscope.service import ReportService

logger = logging.getLogger(__name__)


def create_app(
    *,
    settings: Settings | None = None,
    report_service: ReportService | None = None,
    report_cache: ReportCache | None = None,
) -> FastAPI:
    resolved_settings = settings or Settings()
    logging.basicConfig(
        level=resolved_settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    application = FastAPI(
        title="Monoscope API",
        version=__version__,
        docs_url="/docs",
        redoc_url=None,
    )
    application.state.settings = resolved_settings
    application.state.report_service = report_service or ReportService(
        MonobankClient(resolved_settings.monobank_token.get_secret_value()),
        RateLookup(),
    )
    application.state.report_cache = report_cache or ReportCache(
        resolved_settings.db_path,
        resolved_settings.cache_ttl_seconds,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Request-ID"],
    )
    register_exception_handlers(application)

    @application.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "API request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            },
        )
        return response

    application.include_router(health_router, prefix="/api/v1")
    application.include_router(reports_router, prefix="/api/v1")
    return application
