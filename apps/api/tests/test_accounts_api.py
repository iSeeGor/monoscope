from datetime import datetime
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from apps.api.monoscope_api.cache import ReportCache
from apps.api.monoscope_api.main import create_app
from apps.api.monoscope_api.settings import Settings
from monoscope.accounts import (
    AccountNotFoundError,
    AccountTransaction,
    FopAccount,
)

KYIV = ZoneInfo("Europe/Kyiv")


class FakeAccountService:
    def __init__(self) -> None:
        self.statement_calls: list[tuple[str, int, int]] = []

    def list_fop_accounts(self) -> list[FopAccount]:
        return [
            FopAccount(
                id="fop-id",
                currency="UAH",
                balance=Decimal("1234.56"),
                iban="UA123",
                name="ФОП UAH",
            )
        ]

    def get_statement(
        self, account_id: str, from_timestamp: int, to_timestamp: int
    ) -> list[AccountTransaction]:
        self.statement_calls.append((account_id, from_timestamp, to_timestamp))
        if account_id != "fop-id":
            raise AccountNotFoundError(account_id)
        return [
            AccountTransaction(
                id="transaction-id",
                occurred_at=int(
                    datetime(2026, 9, 2, 12, tzinfo=KYIV).timestamp()
                ),
                description="Client payment",
                comment="Invoice 42",
                amount=Decimal("2500.00"),
                currency="UAH",
                operation_amount=Decimal("2500.00"),
                operation_currency="UAH",
                balance_after=Decimal("3000.00"),
                hold=False,
                direction="incoming",
                counter_name="ТОВ Клієнт",
                counter_edrpou="12345678",
                counter_iban="UA-CLIENT",
                invoice_id="invoice-42",
                receipt_id="receipt-42",
            )
        ]


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        monobank_token="synthetic-token",
        db_path=tmp_path / "cache.db",
        cache_ttl_seconds=60,
        cors_origins="http://localhost:5173",
    )


def _client(tmp_path: Path, service: FakeAccountService) -> TestClient:
    resolved = _settings(tmp_path)
    app = create_app(
        settings=resolved,
        account_service=service,  # type: ignore[arg-type]
        report_cache=ReportCache(resolved.db_path, 60),
    )
    return TestClient(app, raise_server_exceptions=False)


def test_accounts_endpoint_returns_fop_accounts_in_camel_case(
    tmp_path: Path,
) -> None:
    response = _client(tmp_path, FakeAccountService()).get("/api/v1/accounts")

    assert response.status_code == 200
    assert response.json() == {
        "accounts": [
            {
                "id": "fop-id",
                "type": "fop",
                "currency": "UAH",
                "balance": "1234.56",
                "iban": "UA123",
                "name": "ФОП UAH",
            }
        ]
    }


def test_statement_endpoint_uses_inclusive_dates_and_returns_details(
    tmp_path: Path,
) -> None:
    service = FakeAccountService()
    response = _client(tmp_path, service).post(
        "/api/v1/accounts/fop-id/statement",
        json={"dateFrom": "2026-09-01", "dateTo": "2026-09-30"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["accountId"] == "fop-id"
    assert payload["dateFrom"] == "2026-09-01"
    assert payload["dateTo"] == "2026-09-30"
    assert payload["transactions"][0] == {
        "id": "transaction-id",
        "occurredAt": "2026-09-02T12:00:00+03:00",
        "description": "Client payment",
        "comment": "Invoice 42",
        "amount": "2500.00",
        "currency": "UAH",
        "operationAmount": "2500.00",
        "operationCurrency": "UAH",
        "balanceAfter": "3000.00",
        "hold": False,
        "direction": "incoming",
        "counterName": "ТОВ Клієнт",
        "counterEdrpou": "12345678",
        "counterIban": "UA-CLIENT",
        "invoiceId": "invoice-42",
        "receiptId": "receipt-42",
    }
    assert service.statement_calls == [
        (
            "fop-id",
            int(datetime(2026, 9, 1, tzinfo=KYIV).timestamp()),
            int(
                datetime(
                    2026, 9, 30, 23, 59, 59, 999999, tzinfo=KYIV
                ).timestamp()
            ),
        )
    ]


def test_statement_rejects_more_than_31_inclusive_days(tmp_path: Path) -> None:
    response = _client(tmp_path, FakeAccountService()).post(
        "/api/v1/accounts/fop-id/statement",
        json={"dateFrom": "2026-08-01", "dateTo": "2026-09-01"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "REQUEST_SCHEMA_INVALID"


def test_statement_unknown_account_returns_stable_not_found(
    tmp_path: Path,
) -> None:
    response = _client(tmp_path, FakeAccountService()).post(
        "/api/v1/accounts/missing/statement",
        json={"dateFrom": "2026-09-01", "dateTo": "2026-09-05"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ACCOUNT_NOT_FOUND"
