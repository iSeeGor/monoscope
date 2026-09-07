from typing import Annotated

from fastapi import APIRouter, Depends, Response

from apps.api.monoscope_api.cache import ReportCache
from apps.api.monoscope_api.dependencies import (
    get_report_cache,
    get_report_service,
    get_settings,
)
from apps.api.monoscope_api.errors import ApiError
from apps.api.monoscope_api.reporting import (
    build_cache_key,
    build_params,
    expenses_from_cached,
    map_report,
)
from apps.api.monoscope_api.schemas import ReportRequest, ReportResponse
from apps.api.monoscope_api.settings import Settings
from monoscope.report import format_csv, format_markdown_report
from monoscope.service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportResponse)
def create_report(
    request: ReportRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    cache: Annotated[ReportCache, Depends(get_report_cache)],
    service: Annotated[ReportService, Depends(get_report_service)],
) -> ReportResponse:
    cache_key = build_cache_key(
        request,
        settings.monobank_token.get_secret_value(),
    )
    cached = cache.get_by_key(cache_key)
    if cached is not None:
        return cached.response.model_copy(update={"cached": True})

    with cache.lock(cache_key):
        cached = cache.get_by_key(cache_key)
        if cached is not None:
            return cached.response.model_copy(update={"cached": True})

        report = service.generate(build_params(request))
        mapped = map_report(report, request)
        cache.put(cache_key, mapped)
        return mapped.response


@router.get("/{report_id}/export.csv")
def export_csv(
    report_id: str,
    cache: Annotated[ReportCache, Depends(get_report_cache)],
) -> Response:
    report = _cached_report(cache, report_id)
    content = "\ufeff" + format_csv(expenses_from_cached(report))
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="expenses_{report.report_label}.csv"'
            )
        },
    )


@router.get("/{report_id}/export.md")
def export_markdown(
    report_id: str,
    cache: Annotated[ReportCache, Depends(get_report_cache)],
) -> Response:
    report = _cached_report(cache, report_id)
    content = format_markdown_report(
        expenses_from_cached(report),
        card_type=" + ".join(report.response.meta.card_types),
        report_label=report.report_title,
    )
    return Response(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="expenses_{report.report_label}.md"'
            )
        },
    )


def _cached_report(cache: ReportCache, report_id: str):
    report = cache.get_by_report_id(report_id)
    if report is None:
        raise ApiError(
            status_code=404,
            code="REPORT_NOT_FOUND",
            message="Report not found or expired.",
        )
    return report
