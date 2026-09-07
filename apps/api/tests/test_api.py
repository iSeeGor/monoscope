from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from apps.api.monoscope_api.cache import ReportCache
from apps.api.monoscope_api.main import create_app
from apps.api.monoscope_api.settings import Settings
from monoscope.monobank import (
    MonobankRateLimitError,
    MonobankUnauthorizedError,
)
from monoscope.normalize import Expense
from monoscope.service import ReportParams, build_report_result

KYIV = ZoneInfo("Europe/Kyiv")


class FakeReportService:
    def __init__(self) -> None:
        self.calls = 0

    def generate(self, params: ReportParams):
        self.calls += 1
        expense = Expense(
            id="synthetic-1",
            time=int(datetime(2026, 9, 2, 12, tzinfo=KYIV).timestamp()),
            description="Synthetic grocery",
            comment="",
            mcc=5411,
            category="Продукти",
            amount_original=400.0,
            currency_original="UAH",
            amount_eur=10.0,
            amount_uah=400.0,
            rate_used=40.0,
            rate_source="nbu",
            hold=False,
        )
        return build_report_result(params, [expense])


class UnauthorizedService:
    def generate(self, params: ReportParams):
        raise MonobankUnauthorizedError("Synthetic unauthorized response")


class RateLimitedService:
    def generate(self, params: ReportParams):
        raise MonobankRateLimitError("Synthetic rate limit response")


def settings(tmp_path: Path) -> Settings:
    return Settings(
        monobank_token="synthetic-token",
        db_path=tmp_path / "cache.db",
        cache_ttl_seconds=60,
        cors_origins="http://localhost:5173",
    )


def report_payload() -> dict:
    return {
        "cardType": "white",
        "dateFrom": "2026-09-01",
        "dateTo": "2026-09-05",
        "includeHolds": True,
    }


def test_health_does_not_expose_configuration(tmp_path: Path) -> None:
    resolved = settings(tmp_path)
    app = create_app(
        settings=resolved,
        report_service=FakeReportService(),  # type: ignore[arg-type]
        report_cache=ReportCache(resolved.db_path, 60),
    )

    response = TestClient(app).get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}
    assert "synthetic-token" not in response.text


def test_report_response_is_cached_and_uses_camel_case(tmp_path: Path) -> None:
    resolved = settings(tmp_path)
    service = FakeReportService()
    app = create_app(
        settings=resolved,
        report_service=service,  # type: ignore[arg-type]
        report_cache=ReportCache(resolved.db_path, 60),
    )
    client = TestClient(app)

    first = client.post("/api/v1/reports", json=report_payload())
    second = client.post("/api/v1/reports", json=report_payload())

    assert first.status_code == 200
    assert first.json()["cached"] is False
    assert first.json()["meta"]["totalUah"] == "400.00"
    assert first.json()["categories"][0]["sharePct"] == "100.00"
    assert first.json()["expenses"][0]["description"] == "Synthetic grocery"
    assert second.status_code == 200
    assert second.json()["cached"] is True
    assert second.json()["reportId"] == first.json()["reportId"]
    assert service.calls == 1


def test_exports_use_cached_report_without_regeneration(tmp_path: Path) -> None:
    resolved = settings(tmp_path)
    service = FakeReportService()
    app = create_app(
        settings=resolved,
        report_service=service,  # type: ignore[arg-type]
        report_cache=ReportCache(resolved.db_path, 60),
    )
    client = TestClient(app)
    report = client.post("/api/v1/reports", json=report_payload()).json()

    csv_response = client.get(
        f"/api/v1/reports/{report['reportId']}/export.csv"
    )
    markdown_response = client.get(
        f"/api/v1/reports/{report['reportId']}/export.md"
    )

    assert csv_response.status_code == 200
    assert "Synthetic grocery" in csv_response.text
    assert "attachment; filename=" in csv_response.headers["content-disposition"]
    assert markdown_response.status_code == 200
    assert "Витрати Monobank" in markdown_response.text
    assert service.calls == 1


def test_invalid_long_date_range_returns_stable_error(tmp_path: Path) -> None:
    resolved = settings(tmp_path)
    app = create_app(
        settings=resolved,
        report_service=FakeReportService(),  # type: ignore[arg-type]
        report_cache=ReportCache(resolved.db_path, 60),
    )

    response = TestClient(app).post(
        "/api/v1/reports",
        json={
            "cardType": "white",
            "dateFrom": "2026-01-01",
            "dateTo": "2026-02-01",
            "includeHolds": True,
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "REQUEST_SCHEMA_INVALID"
    assert response.json()["error"]["requestId"]


def test_upstream_unauthorized_is_mapped_without_secret(tmp_path: Path) -> None:
    resolved = settings(tmp_path)
    app = create_app(
        settings=resolved,
        report_service=UnauthorizedService(),  # type: ignore[arg-type]
        report_cache=ReportCache(resolved.db_path, 60),
    )

    response = TestClient(app, raise_server_exceptions=False).post(
        "/api/v1/reports",
        json=report_payload(),
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "MONOBANK_UNAUTHORIZED"
    assert "synthetic-token" not in response.text


def test_upstream_rate_limit_has_actionable_error(tmp_path: Path) -> None:
    resolved = settings(tmp_path)
    app = create_app(
        settings=resolved,
        report_service=RateLimitedService(),  # type: ignore[arg-type]
        report_cache=ReportCache(resolved.db_path, 60),
    )

    response = TestClient(app, raise_server_exceptions=False).post(
        "/api/v1/reports",
        json=report_payload(),
    )

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "MONOBANK_RATE_LIMITED"
    assert "60 seconds" in response.json()["error"]["message"]


def test_missing_export_returns_stable_not_found_error(tmp_path: Path) -> None:
    resolved = settings(tmp_path)
    app = create_app(
        settings=resolved,
        report_service=FakeReportService(),  # type: ignore[arg-type]
        report_cache=ReportCache(resolved.db_path, 60),
    )

    response = TestClient(app, raise_server_exceptions=False).get(
        "/api/v1/reports/missing/export.csv"
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REPORT_NOT_FOUND"
