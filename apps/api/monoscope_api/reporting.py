from __future__ import annotations

import hashlib
import json
from datetime import datetime, time
from decimal import Decimal
from uuid import uuid4
from zoneinfo import ZoneInfo

from apps.api.monoscope_api.schemas import (
    CachedReport,
    CategorySummaryResponse,
    DailySummaryResponse,
    ExpenseResponse,
    ReportMeta,
    ReportRequest,
    ReportResponse,
)
from monoscope.normalize import Expense
from monoscope.service import ReportParams, ReportResult

KYIV = ZoneInfo("Europe/Kyiv")
CALCULATION_VERSION = "2"


def build_params(request: ReportRequest, now: datetime | None = None) -> ReportParams:
    current = now or datetime.now(KYIV)
    start = datetime.combine(request.date_from, time.min, tzinfo=KYIV)
    requested_end = datetime.combine(request.date_to, time.max, tzinfo=KYIV)
    end = min(requested_end, current) if request.date_to == current.date() else requested_end
    report_label = f"{request.date_from.isoformat()}_{request.date_to.isoformat()}"
    report_title = f"{request.date_from.isoformat()} — {request.date_to.isoformat()}"
    card_types = ("white", "black") if request.include_black_card else ("white",)
    return ReportParams(
        card_types=card_types,
        from_timestamp=int(start.timestamp()),
        to_timestamp=int(end.timestamp()),
        include_holds=request.include_holds,
        report_label=report_label,
        report_title=report_title,
    )


def build_cache_key(request: ReportRequest, token: str) -> str:
    token_fingerprint = hashlib.sha256(token.encode()).hexdigest()
    payload = {
        "calculationVersion": CALCULATION_VERSION,
        "request": request.model_dump(mode="json", by_alias=True),
        "tokenFingerprint": token_fingerprint,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def map_report(
    result: ReportResult,
    request: ReportRequest,
    *,
    generated_at: datetime | None = None,
) -> CachedReport:
    total_eur = result.totals.total_eur
    response = ReportResponse(
        report_id=f"rpt_{uuid4().hex}",
        cached=False,
        meta=ReportMeta(
            card_types=list(result.params.card_types),
            date_from=request.date_from,
            date_to=request.date_to,
            generated_at=generated_at or datetime.now(KYIV),
            transaction_count=result.totals.transaction_count,
            pending_count=result.totals.pending_count,
            total_uah=_money(result.totals.total_uah),
            total_eur=_money(total_eur),
        ),
        categories=[
            CategorySummaryResponse(
                category=item.category,
                total_uah=_money(item.total_uah),
                total_eur=_money(item.total_eur),
                share_pct=_percentage(item.total_eur, total_eur),
                count=item.count,
            )
            for item in result.categories
        ],
        daily=[
            DailySummaryResponse(
                date=item.date,
                total_uah=_money(item.total_uah),
                total_eur=_money(item.total_eur),
                count=item.count,
            )
            for item in result.daily
        ],
        expenses=[
            ExpenseResponse(
                id=item.id,
                occurred_at=datetime.fromtimestamp(item.time, tz=KYIV),
                description=item.description,
                comment=item.comment,
                mcc=item.mcc,
                category=item.category,
                amount_original=_money(item.amount_original),
                currency_original=item.currency_original,
                amount_uah=_money(item.amount_uah),
                amount_eur=_money(item.amount_eur),
                rate_used=_rate(item.rate_used),
                rate_source=item.rate_source,
                hold=item.hold,
                card_type=item.card_type,
            )
            for item in result.expenses
        ],
    )
    return CachedReport(
        response=response,
        report_label=result.params.report_label,
        report_title=result.params.report_title,
    )


def expenses_from_cached(report: CachedReport) -> list[Expense]:
    return [
        Expense(
            id=item.id,
            time=int(item.occurred_at.timestamp()),
            description=item.description,
            comment=item.comment,
            mcc=item.mcc,
            category=item.category,
            amount_original=float(item.amount_original),
            currency_original=item.currency_original,
            amount_eur=float(item.amount_eur),
            amount_uah=float(item.amount_uah),
            rate_used=float(item.rate_used) if item.rate_used is not None else None,
            rate_source=item.rate_source,
            hold=item.hold,
            card_type=item.card_type,
        )
        for item in report.response.expenses
    ]


def _money(value: float) -> Decimal:
    return Decimal(f"{value:.2f}")


def _rate(value: float | None) -> Decimal | None:
    return Decimal(f"{value:.4f}") if value is not None else None


def _percentage(value: float, total: float) -> Decimal:
    if total == 0:
        return Decimal("0.00")
    return Decimal(f"{value / total * 100:.2f}")
