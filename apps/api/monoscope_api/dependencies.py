from fastapi import Request

from apps.api.monoscope_api.cache import ReportCache
from apps.api.monoscope_api.settings import Settings
from monoscope.service import ReportService


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_report_cache(request: Request) -> ReportCache:
    return request.app.state.report_cache


def get_report_service(request: Request) -> ReportService:
    return request.app.state.report_service
