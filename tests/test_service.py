from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from monoscope.service import ReportParams, ReportService

RateSource = Literal["operation", "nbu", "monobank"]
KYIV = ZoneInfo("Europe/Kyiv")


class FakeStatements:
    def __init__(self, items: list[dict]) -> None:
        self.items = items
        self.requested: tuple[str, int, int] | None = None

    def find_account(self, card_type: str) -> dict:
        assert card_type == "white"
        return {"id": "account-id", "type": "white"}

    def get_statement_range(
        self, account_id: str, from_ts: int, to_ts: int
    ) -> list[dict]:
        self.requested = (account_id, from_ts, to_ts)
        return self.items


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
        [
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
    )
    params = ReportParams(
        card_type="white",
        from_timestamp=first_time,
        to_timestamp=second_time,
        include_holds=True,
        report_label="2026-09-01_2026-09-02",
        report_title="2026-09-01 — 2026-09-02",
    )

    result = ReportService(statements, FakeRates()).generate(params)

    assert statements.requested == ("account-id", first_time, second_time)
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
