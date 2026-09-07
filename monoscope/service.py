from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import date
from typing import Any, Protocol

from monoscope.normalize import Expense, normalize_expenses
from monoscope.rates import RateSource, kyiv_date
from monoscope.report import CategorySummary, summarize_by_category


class StatementProvider(Protocol):
    def find_accounts(
        self, card_types: tuple[str, ...]
    ) -> dict[str, dict[str, Any]]: ...

    def get_statement_range(
        self, account_id: str, from_ts: int, to_ts: int
    ) -> list[dict[str, Any]]: ...


class RateProvider(Protocol):
    def uah_per_eur(self, on_date: date) -> tuple[float, RateSource]: ...

    def uah_per_currency(
        self, currency_code: int, on_date: date
    ) -> tuple[float, RateSource]: ...


@dataclass(frozen=True)
class ReportParams:
    card_types: tuple[str, ...]
    from_timestamp: int
    to_timestamp: int
    include_holds: bool
    report_label: str
    report_title: str


@dataclass(frozen=True)
class ReportTotals:
    total_eur: float
    total_uah: float
    transaction_count: int
    pending_count: int


@dataclass(frozen=True)
class DailySummary:
    date: date
    total_eur: float
    total_uah: float
    count: int


@dataclass(frozen=True)
class ReportResult:
    params: ReportParams
    expenses: list[Expense]
    categories: list[CategorySummary]
    daily: list[DailySummary]
    totals: ReportTotals


class ReportService:
    def __init__(self, statements: StatementProvider, rates: RateProvider) -> None:
        self._statements = statements
        self._rates = rates

    def generate(self, params: ReportParams) -> ReportResult:
        accounts = self._statements.find_accounts(params.card_types)
        expenses: list[Expense] = []
        for card_type in params.card_types:
            account = accounts[card_type]
            items = self._statements.get_statement_range(
                str(account["id"]),
                params.from_timestamp,
                params.to_timestamp,
            )
            card_expenses = normalize_expenses(
                items,
                self._rates,
                include_holds=params.include_holds,
            )
            expenses.extend(
                replace(expense, card_type=card_type) for expense in card_expenses
            )
        expenses.sort(key=lambda expense: expense.time)
        return build_report_result(params, expenses)


def build_report_result(
    params: ReportParams, expenses: Sequence[Expense]
) -> ReportResult:
    expense_list = list(expenses)
    total_eur = round(sum(item.amount_eur for item in expense_list), 2)
    total_uah = round(sum(item.amount_uah for item in expense_list), 2)
    totals = ReportTotals(
        total_eur=total_eur,
        total_uah=total_uah,
        transaction_count=len(expense_list),
        pending_count=sum(1 for item in expense_list if item.hold),
    )

    daily_totals: dict[date, tuple[float, float, int]] = defaultdict(
        lambda: (0.0, 0.0, 0)
    )
    for item in expense_list:
        item_date = kyiv_date(item.time)
        eur, uah, count = daily_totals[item_date]
        daily_totals[item_date] = (
            eur + item.amount_eur,
            uah + item.amount_uah,
            count + 1,
        )

    daily = [
        DailySummary(
            date=item_date,
            total_eur=round(eur, 2),
            total_uah=round(uah, 2),
            count=count,
        )
        for item_date, (eur, uah, count) in sorted(daily_totals.items())
    ]

    return ReportResult(
        params=params,
        expenses=expense_list,
        categories=summarize_by_category(expense_list),
        daily=daily,
        totals=totals,
    )
