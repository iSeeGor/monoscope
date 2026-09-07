from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

import pytest

from monoscope.normalize import normalize_expenses, select_expense_items

RateSource = Literal["operation", "nbu", "monobank"]
KYIV = ZoneInfo("Europe/Kyiv")


class FakeRates:
    def uah_per_eur(self, on_date: date) -> tuple[float, RateSource]:
        return 40.0, "nbu"

    def uah_per_currency(
        self, currency_code: int, on_date: date
    ) -> tuple[float, RateSource]:
        assert currency_code == 840
        return 36.0, "nbu"


def timestamp(day: int, hour: int = 12) -> int:
    return int(datetime(2026, 9, day, hour, tzinfo=KYIV).timestamp())


def item(
    item_id: str,
    *,
    day: int = 1,
    amount: int = -400_000,
    operation_amount: int | None = None,
    currency_code: int = 980,
    description: str = "Synthetic merchant",
    mcc: int = 5411,
    hold: bool = False,
) -> dict:
    return {
        "id": item_id,
        "time": timestamp(day),
        "amount": amount,
        "operationAmount": amount if operation_amount is None else operation_amount,
        "currencyCode": currency_code,
        "description": description,
        "comment": "",
        "mcc": mcc,
        "hold": hold,
    }


def test_selects_only_expenses() -> None:
    income = item("income", amount=100_00)
    expense = item("expense")

    assert select_expense_items([income, expense]) == [expense]


def test_excludes_hold_when_settled_duplicate_exists() -> None:
    hold = item("hold", day=1, hold=True)
    settled = item("settled", day=2)

    assert select_expense_items([hold, settled]) == [settled]


def test_include_holds_flag_excludes_all_pending_items() -> None:
    hold = item("hold", hold=True)

    assert select_expense_items([hold], include_holds=False) == []


def test_normalizes_uah_eur_and_usd() -> None:
    expenses = normalize_expenses(
        [
            item("uah", amount=-400_000),
            item(
                "eur",
                amount=-200_000,
                operation_amount=-5_000,
                currency_code=978,
            ),
            item(
                "usd",
                amount=-360_000,
                operation_amount=-10_000,
                currency_code=840,
            ),
        ],
        FakeRates(),  # type: ignore[arg-type]
    )

    by_id = {expense.id: expense for expense in expenses}
    assert {expense.card_type for expense in expenses} == {""}
    assert by_id["uah"].amount_uah == 4000.0
    assert by_id["uah"].amount_eur == 100.0
    assert by_id["uah"].rate_used == 40.0

    assert by_id["eur"].amount_original == 50.0
    assert by_id["eur"].amount_eur == 50.0
    assert by_id["eur"].amount_uah == 2000.0

    assert by_id["usd"].amount_original == 100.0
    assert by_id["usd"].amount_uah == 3600.0
    assert by_id["usd"].amount_eur == 90.0
    assert by_id["usd"].rate_used == pytest.approx(1.1111)


def test_normalization_applies_custom_description_rule() -> None:
    expense = normalize_expenses(
        [
            item(
                "subscription",
                description="OpenAI *ChatGPT Subscription",
                mcc=5734,
            )
        ],
        FakeRates(),  # type: ignore[arg-type]
    )[0]

    assert expense.category == "Підписки та AI"
