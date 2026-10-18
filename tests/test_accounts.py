from decimal import Decimal
from typing import Any

import pytest

from monoscope.accounts import AccountNotFoundError, AccountService
from monoscope.monobank import CLIENT_INFO_CACHE_SECONDS


class FakeClient:
    def __init__(self) -> None:
        self.client_info_calls = 0
        self.statement_calls: list[tuple[str, int, int]] = []

    def get_client_info(self) -> dict[str, Any]:
        self.client_info_calls += 1
        return {
            "accounts": [
                {
                    "id": "personal-id",
                    "type": "black",
                    "currencyCode": 980,
                    "balance": 500,
                },
                {
                    "id": "fop-eur-id",
                    "type": "fop",
                    "currencyCode": 978,
                    "balance": 12345,
                    "iban": "UA-EUR",
                },
                {
                    "id": "fop-uah-id",
                    "type": "fop",
                    "currencyCode": 980,
                    "balance": 987654,
                    "iban": "UA-UAH",
                },
            ]
        }

    def get_statement(
        self, account_id: str, from_timestamp: int, to_timestamp: int
    ) -> list[dict[str, Any]]:
        self.statement_calls.append((account_id, from_timestamp, to_timestamp))
        return [
            {
                "id": "outgoing",
                "time": 100,
                "description": "Tax",
                "comment": "Єдиний податок",
                "amount": -10050,
                "operationAmount": -10050,
                "currencyCode": 980,
                "balance": 20000,
                "hold": True,
            },
            {
                "id": "incoming",
                "time": 200,
                "description": "Payment",
                "comment": "Invoice 42",
                "amount": 250000,
                "operationAmount": 250000,
                "currencyCode": 980,
                "balance": 270000,
                "counterName": "ТОВ Клієнт",
                "counterEdrpou": "12345678",
                "counterIban": "UA-CLIENT",
                "invoiceId": "invoice-42",
                "receiptId": "receipt-42",
            },
        ]


def test_lists_only_fop_accounts_with_money_and_identity() -> None:
    service = AccountService(FakeClient())  # type: ignore[arg-type]

    accounts = service.list_fop_accounts()

    assert [(item.id, item.currency) for item in accounts] == [
        ("fop-uah-id", "UAH"),
        ("fop-eur-id", "EUR"),
    ]
    assert accounts[1].balance.as_tuple().exponent == -2
    assert accounts[1].balance == Decimal("123.45")
    assert accounts[0].iban == "UA-UAH"
    assert accounts[0].name == "ФОП UAH"


def test_statement_preserves_both_directions_and_payment_details() -> None:
    client = FakeClient()
    service = AccountService(client)  # type: ignore[arg-type]

    transactions = service.get_statement("fop-uah-id", 10, 20)

    assert client.statement_calls == [("fop-uah-id", 10, 20)]
    assert [item.id for item in transactions] == ["incoming", "outgoing"]
    incoming = transactions[0]
    assert incoming.direction == "incoming"
    assert incoming.amount == Decimal("2500")
    assert incoming.currency == "UAH"
    assert incoming.balance_after == Decimal("2700")
    assert incoming.counter_name == "ТОВ Клієнт"
    assert incoming.counter_edrpou == "12345678"
    assert incoming.counter_iban == "UA-CLIENT"
    assert incoming.invoice_id == "invoice-42"
    assert incoming.receipt_id == "receipt-42"
    outgoing = transactions[1]
    assert outgoing.direction == "outgoing"
    assert outgoing.amount == Decimal("-100.5")
    assert outgoing.hold is True


def test_statement_rejects_non_fop_or_unknown_account() -> None:
    client = FakeClient()
    service = AccountService(client)  # type: ignore[arg-type]

    with pytest.raises(AccountNotFoundError):
        service.get_statement("personal-id", 10, 20)

    assert client.statement_calls == []


def test_account_list_is_cached_for_the_follow_up_statement() -> None:
    client = FakeClient()
    service = AccountService(client, clock=lambda: 10)  # type: ignore[arg-type]

    service.list_fop_accounts()
    service.get_statement("fop-uah-id", 10, 20)

    assert client.client_info_calls == 1


def test_account_list_cache_expires_after_24_hours() -> None:
    client = FakeClient()
    now = [0.0]
    service = AccountService(  # type: ignore[arg-type]
        client,
        clock=lambda: now[0],
    )

    service.list_fop_accounts()
    now[0] = CLIENT_INFO_CACHE_SECONDS - 1
    service.list_fop_accounts()
    now[0] = CLIENT_INFO_CACHE_SECONDS
    service.list_fop_accounts()

    assert CLIENT_INFO_CACHE_SECONDS == 24 * 60 * 60
    assert client.client_info_calls == 2
