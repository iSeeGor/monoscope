from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from monoscope.service import ReportParams, ReportService

RateSource = Literal["operation", "nbu", "monobank"]
KYIV = ZoneInfo("Europe/Kyiv")


class FakeStatements:
    def __init__(self, items_by_account: dict[str, list[dict]]) -> None:
        self.items_by_account = items_by_account
        self.requested: list[tuple[str, int, int]] = []
        self.lookup_calls = 0

    def find_accounts(self, card_types: tuple[str, ...]) -> dict[str, dict]:
        self.lookup_calls += 1
        return {
            card_type: {"id": f"{card_type}-account", "type": card_type}
            for card_type in card_types
        }

    def get_statement_range(
        self, account_id: str, from_ts: int, to_ts: int
    ) -> list[dict]:
        self.requested.append((account_id, from_ts, to_ts))
        return self.items_by_account[account_id]


class FakeRates:
    def uah_per_eur(self, on_date: date) -> tuple[float, RateSource]:
        return 40.0, "nbu"

    def uah_per_currency(
        self, currency_code: int, on_date: date
    ) -> tuple[float, RateSource]:
        raise AssertionError("Unexpected currency lookup")


def test_report_service_builds_totals_categories_and_daily_series() -> None:
    first_time = int(datetime(2026, 9, 1, 12, tzinfo=KYIV).timestamp())
    second_time = int(datetime(2026, 9, 2, 12, tzinfo=KYIV).timestamp())
    statements = FakeStatements(
        {
            "white-account": [
                {
                    "id": "first",
                    "time": first_time,
                    "amount": -40000,
                    "operationAmount": -40000,
                    "currencyCode": 980,
                    "description": "Synthetic shop",
                    "mcc": 5411,
                    "hold": False,
                },
                {
                    "id": "second",
                    "time": second_time,
                    "amount": -20000,
                    "operationAmount": -20000,
                    "currencyCode": 980,
                    "description": "Synthetic shop",
                    "mcc": 5411,
                    "hold": True,
                },
            ]
        }
    )
    params = ReportParams(
        card_types=("white",),
        from_timestamp=first_time,
        to_timestamp=second_time,
        include_holds=True,
        report_label="2026-09-01_2026-09-02",
        report_title="2026-09-01 — 2026-09-02",
    )

    result = ReportService(statements, FakeRates()).generate(params)

    assert statements.lookup_calls == 1
    assert statements.requested == [("white-account", first_time, second_time)]
    assert {expense.card_type for expense in result.expenses} == {"white"}
    assert result.totals.total_uah == 600.0
    assert result.totals.total_eur == 15.0
    assert result.totals.transaction_count == 2
    assert result.totals.pending_count == 1
    assert [(row.category, row.total_uah) for row in result.categories] == [
        ("Продукти", 600.0)
    ]
    assert [(row.date.isoformat(), row.total_uah) for row in result.daily] == [
        ("2026-09-01", 400.0),
        ("2026-09-02", 200.0),
    ]


def test_report_service_combines_cards_without_cross_card_deduplication() -> None:
    black_time = int(datetime(2026, 9, 1, 10, tzinfo=KYIV).timestamp())
    white_time = int(datetime(2026, 9, 1, 12, tzinfo=KYIV).timestamp())
    common = {
        "id": "same-upstream-id",
        "amount": -40000,
        "operationAmount": -40000,
        "currencyCode": 980,
        "description": "Synthetic shop",
        "mcc": 5411,
        "hold": False,
    }
    statements = FakeStatements(
        {
            "white-account": [{**common, "time": white_time}],
            "black-account": [{**common, "time": black_time}],
        }
    )
    params = ReportParams(
        card_types=("black", "white"),
        from_timestamp=black_time,
        to_timestamp=white_time,
        include_holds=True,
        report_label="2026-09-01",
        report_title="2026-09-01",
    )

    result = ReportService(statements, FakeRates()).generate(params)

    assert statements.lookup_calls == 1
    assert result.params.card_types == ("white", "black")
    assert [request[0] for request in statements.requested] == [
        "white-account",
        "black-account",
    ]
    assert [expense.card_type for expense in result.expenses] == ["black", "white"]
    assert result.totals.transaction_count == 2
    assert result.totals.total_uah == 800.0


def test_report_service_supports_black_only_scope() -> None:
    transaction_time = int(datetime(2026, 9, 1, 12, tzinfo=KYIV).timestamp())
    statements = FakeStatements(
        {
            "black-account": [
                {
                    "id": "black-only",
                    "time": transaction_time,
                    "amount": -40000,
                    "operationAmount": -40000,
                    "currencyCode": 980,
                    "description": "Synthetic black-card shop",
                    "mcc": 5411,
                    "hold": False,
                }
            ]
        }
    )
    params = ReportParams(
        card_types=("black",),
        from_timestamp=transaction_time,
        to_timestamp=transaction_time,
        include_holds=True,
        report_label="2026-09-01",
        report_title="2026-09-01",
    )

    result = ReportService(statements, FakeRates()).generate(params)

    assert result.params.card_types == ("black",)
    assert statements.requested == [
        ("black-account", transaction_time, transaction_time)
    ]
    assert [expense.card_type for expense in result.expenses] == ["black"]
