from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from monoscope.categories import categorize
from monoscope.config import CURRENCY_CODES
from monoscope.rates import RateLookup, RateSource, kyiv_date


@dataclass(frozen=True)
class Expense:
    id: str
    time: int
    description: str
    comment: str
    mcc: int | None
    category: str
    amount_original: float
    currency_original: str
    amount_eur: float
    amount_uah: float
    rate_used: float | None
    rate_source: RateSource | None
    hold: bool
    card_type: str = ""


def is_expense(item: dict[str, Any]) -> bool:
    return int(item.get("amount", 0)) < 0


def _minor_amount(item: dict[str, Any], field: str) -> int:
    return abs(int(item.get(field, 0)))


def _has_settled_duplicate(
    hold_item: dict[str, Any], settled_items: list[dict[str, Any]]
) -> bool:
    """Skip hold auth when the same purchase already has a settled row."""
    hold_time = int(hold_item["time"])
    hold_desc = (hold_item.get("description") or "").strip().casefold()
    hold_invoice = hold_item.get("invoiceId")
    hold_op = _minor_amount(hold_item, "operationAmount")
    hold_amt = _minor_amount(hold_item, "amount")

    for settled in settled_items:
        settled_time = int(settled["time"])
        if settled_time < hold_time:
            continue
        if settled_time - hold_time > 14 * 86400:
            continue

        if hold_invoice and settled.get("invoiceId") == hold_invoice:
            return True

        if (settled.get("description") or "").strip().casefold() != hold_desc:
            continue

        settled_op = _minor_amount(settled, "operationAmount")
        settled_amt = _minor_amount(settled, "amount")
        if settled_op == hold_op or settled_amt == hold_amt:
            return True

    return False


def select_expense_items(
    items: list[dict[str, Any]], *, include_holds: bool = True
) -> list[dict[str, Any]]:
    negatives = [item for item in items if is_expense(item)]
    if not include_holds:
        return [item for item in negatives if not item.get("hold")]

    settled = [item for item in negatives if not item.get("hold")]
    selected: list[dict[str, Any]] = list(settled)

    for item in negatives:
        if not item.get("hold"):
            continue
        if _has_settled_duplicate(item, settled):
            continue
        selected.append(item)

    selected.sort(key=lambda item: int(item["time"]))
    return selected


def normalize_expenses(
    items: list[dict[str, Any]], rates: RateLookup, *, include_holds: bool = True
) -> list[Expense]:
    expenses = [
        _normalize_item(item, rates)
        for item in select_expense_items(items, include_holds=include_holds)
    ]
    expenses.sort(key=lambda e: e.time)
    return expenses


def _normalize_item(item: dict[str, Any], rates: RateLookup) -> Expense:
    currency_code = int(item.get("currencyCode", 980))
    currency = CURRENCY_CODES.get(currency_code, str(currency_code))
    operation_amount = abs(int(item.get("operationAmount", item.get("amount", 0)))) / 100
    account_amount = abs(int(item.get("amount", 0))) / 100
    tx_date = kyiv_date(int(item["time"]))

    amount_eur: float
    amount_uah: float
    amount_original: float

    if currency_code == 978:
        amount_eur = operation_amount
        amount_original = operation_amount
        uah_per_eur, rate_source = rates.uah_per_eur(tx_date)
        amount_uah = operation_amount * uah_per_eur
        rate_used = 1.0
        rate_source = "operation"
    elif currency_code == 980:
        amount_original = account_amount
        amount_uah = account_amount
        uah_per_eur, rate_source = rates.uah_per_eur(tx_date)
        amount_eur = account_amount / uah_per_eur
        rate_used = uah_per_eur
    else:
        amount_original = operation_amount
        uah_per_unit, rate_source = rates.uah_per_currency(currency_code, tx_date)
        amount_uah = operation_amount * uah_per_unit
        uah_per_eur, eur_source = rates.uah_per_eur(tx_date)
        amount_eur = amount_uah / uah_per_eur
        rate_used = uah_per_eur / uah_per_unit if uah_per_unit else None
        if eur_source == "nbu":
            rate_source = "nbu"

    return Expense(
        id=str(item.get("id", "")),
        time=int(item["time"]),
        description=str(item.get("description", "")),
        comment=str(item.get("comment", "") or ""),
        mcc=item.get("mcc"),
        category=categorize(item.get("mcc"), str(item.get("description", ""))),
        amount_original=round(amount_original, 2),
        currency_original=currency,
        amount_eur=round(amount_eur, 2),
        amount_uah=round(amount_uah, 2),
        rate_used=round(rate_used, 4) if rate_used is not None else None,
        rate_source=rate_source,
        hold=bool(item.get("hold", False)),
    )
