from typing import Any

import pytest

from monoscope.monobank import (
    MAX_STATEMENT_SECONDS,
    RATE_LIMIT_SECONDS,
    MonobankClient,
    MonobankError,
    _statement_windows,
)


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0
        self.sleeps: list[float] = []

    def __call__(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds


class FakeMonobankClient(MonobankClient):
    def __init__(self, clock: FakeClock) -> None:
        super().__init__("synthetic-token", clock=clock, sleep=clock.sleep)
        self.client_info_calls = 0
        self.paths: list[str] = []

    def get_client_info(self) -> dict[str, Any]:
        self.client_info_calls += 1
        return {
            "accounts": [
                {"id": "white-id", "type": "white"},
                {"id": "black-id", "type": "black"},
            ]
        }

    def _get(self, path: str) -> Any:
        self.paths.append(path)
        return []


def test_statement_window_keeps_short_range_intact() -> None:
    assert list(_statement_windows(100, 200)) == [(100, 200)]


def test_statement_windows_are_contiguous_without_overlap() -> None:
    start = 100
    end = start + MAX_STATEMENT_SECONDS + 50

    windows = list(_statement_windows(start, end))

    assert windows == [
        (start, start + MAX_STATEMENT_SECONDS),
        (start + MAX_STATEMENT_SECONDS + 1, end),
    ]


def test_statement_window_includes_single_timestamp() -> None:
    assert list(_statement_windows(100, 100)) == [(100, 100)]


def test_find_accounts_uses_one_client_info_lookup() -> None:
    client = FakeMonobankClient(FakeClock())

    accounts = client.find_accounts(("white", "black"))

    assert client.client_info_calls == 1
    assert accounts["white"]["id"] == "white-id"
    assert accounts["black"]["id"] == "black-id"


def test_find_accounts_prefers_uah_account_for_duplicate_card_type() -> None:
    client = FakeMonobankClient(FakeClock())
    client.get_client_info = lambda: {
        "accounts": [
            {"id": "white-id", "type": "white", "currencyCode": 980},
            {"id": "black-eur-id", "type": "black", "currencyCode": 978},
            {"id": "black-uah-id", "type": "black", "currencyCode": 980},
        ]
    }

    accounts = client.find_accounts(("white", "black"))

    assert accounts["white"]["id"] == "white-id"
    assert accounts["black"]["id"] == "black-uah-id"


def test_find_accounts_rejects_duplicate_type_without_unique_uah_account() -> None:
    client = FakeMonobankClient(FakeClock())
    client.get_client_info = lambda: {
        "accounts": [
            {"id": "black-eur-id", "type": "black", "currencyCode": 978},
            {"id": "black-usd-id", "type": "black", "currencyCode": 840},
        ]
    }

    with pytest.raises(MonobankError, match="unique UAH account"):
        client.find_accounts(("black",))


def test_statement_rate_limit_applies_across_separate_ranges() -> None:
    clock = FakeClock()
    client = FakeMonobankClient(clock)

    client.get_statement_range("white-id", 100, 200)
    client.get_statement_range("black-id", 100, 200)

    assert clock.sleeps == [RATE_LIMIT_SECONDS]
    assert client.paths == [
        "/personal/statement/white-id/100/200",
        "/personal/statement/black-id/100/200",
    ]
