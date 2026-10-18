from __future__ import annotations

import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal

from monoscope.config import CURRENCY_CODES
from monoscope.monobank import CLIENT_INFO_CACHE_SECONDS, MonobankClient

MONEY_QUANTUM = Decimal("0.01")


class AccountNotFoundError(Exception):
    """Raised when a requested FOP account is not available to the token."""


@dataclass(frozen=True)
class FopAccount:
    id: str
    currency: str
    balance: Decimal
    iban: str
    name: str
    type: Literal["fop"] = "fop"


@dataclass(frozen=True)
class AccountTransaction:
    id: str
    occurred_at: int
    description: str
    comment: str
    amount: Decimal
    currency: str
    operation_amount: Decimal
    operation_currency: str
    balance_after: Decimal
    hold: bool
    direction: Literal["incoming", "outgoing"]
    counter_name: str | None
    counter_edrpou: str | None
    counter_iban: str | None
    invoice_id: str | None
    receipt_id: str | None


class AccountService:
    def __init__(
        self,
        client: MonobankClient,
        *,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._client = client
        self._clock = clock
        self._accounts: tuple[FopAccount, ...] | None = None
        self._accounts_loaded_at: float | None = None
        self._accounts_lock = threading.Lock()

    def list_fop_accounts(self) -> list[FopAccount]:
        now = self._clock()
        with self._accounts_lock:
            if (
                self._accounts is not None
                and self._accounts_loaded_at is not None
                and now - self._accounts_loaded_at < CLIENT_INFO_CACHE_SECONDS
            ):
                return list(self._accounts)

            accounts = self._client.get_client_info().get("accounts", [])
            result = sorted(
                (
                    _map_account(account)
                    for account in accounts
                    if account.get("type") == "fop"
                ),
                key=_account_sort_key,
            )
            self._accounts = tuple(result)
            self._accounts_loaded_at = self._clock()
            return list(self._accounts)

    def get_statement(
        self,
        account_id: str,
        from_timestamp: int,
        to_timestamp: int,
    ) -> list[AccountTransaction]:
        account = next(
            (
                account
                for account in self.list_fop_accounts()
                if account.id == account_id
            ),
            None,
        )
        if account is None:
            raise AccountNotFoundError(account_id)

        items = self._client.get_statement(account_id, from_timestamp, to_timestamp)
        transactions = [_map_transaction(item, account.currency) for item in items]
        return sorted(transactions, key=lambda item: item.occurred_at, reverse=True)


def _map_account(item: dict[str, Any]) -> FopAccount:
    currency = _currency(item.get("currencyCode"))
    return FopAccount(
        id=str(item.get("id", "")),
        currency=currency,
        balance=_major_units(item.get("balance")),
        iban=str(item.get("iban", "") or ""),
        name=f"ФОП {currency}",
    )


def _account_sort_key(account: FopAccount) -> tuple[bool, str, str]:
    return (account.currency != "UAH", account.currency, account.id)


def _map_transaction(
    item: dict[str, Any], account_currency: str
) -> AccountTransaction:
    amount = _major_units(item.get("amount"))
    operation_amount = _major_units(item.get("operationAmount", item.get("amount")))
    return AccountTransaction(
        id=str(item.get("id", "")),
        occurred_at=int(item["time"]),
        description=str(item.get("description", "") or ""),
        comment=str(item.get("comment", "") or ""),
        amount=amount,
        currency=account_currency,
        operation_amount=operation_amount,
        operation_currency=_currency(item.get("currencyCode")),
        balance_after=_major_units(item.get("balance")),
        hold=bool(item.get("hold", False)),
        direction="incoming" if amount >= 0 else "outgoing",
        counter_name=_optional_string(item.get("counterName")),
        counter_edrpou=_optional_string(item.get("counterEdrpou")),
        counter_iban=_optional_string(item.get("counterIban")),
        invoice_id=_optional_string(item.get("invoiceId")),
        receipt_id=_optional_string(item.get("receiptId")),
    )


def _currency(value: Any) -> str:
    code = int(value or 980)
    return CURRENCY_CODES.get(code, str(code))


def _major_units(value: Any) -> Decimal:
    return (Decimal(int(value or 0)) / Decimal(100)).quantize(MONEY_QUANTUM)


def _optional_string(value: Any) -> str | None:
    if value is None or value == "":
        return None
    return str(value)
