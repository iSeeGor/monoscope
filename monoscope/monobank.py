from __future__ import annotations

import time
from collections.abc import Callable, Iterator
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import requests

KYIV = ZoneInfo("Europe/Kyiv")
BASE_URL = "https://api.monobank.ua"
REQUEST_TIMEOUT = 30
MAX_STATEMENT_SECONDS = 31 * 86400
RATE_LIMIT_SECONDS = 61


class MonobankError(Exception):
    pass


class MonobankUnauthorizedError(MonobankError):
    pass


class MonobankRateLimitError(MonobankError):
    pass


class MonobankClient:
    def __init__(
        self,
        token: str,
        *,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._token = token
        self._session = requests.Session()
        self._session.headers["X-Token"] = token
        self._clock = clock
        self._sleep = sleep
        self._last_statement_at: float | None = None

    def get_client_info(self) -> dict[str, Any]:
        return self._get("/personal/client-info")

    def get_statement(
        self, account_id: str, from_ts: int, to_ts: int
    ) -> list[dict[str, Any]]:
        self._wait_for_statement_slot()
        path = f"/personal/statement/{account_id}/{from_ts}/{to_ts}"
        data = self._get(path)
        if not isinstance(data, list):
            raise MonobankError("Unexpected statement response format")
        return data

    def get_statement_range(
        self, account_id: str, from_ts: int, to_ts: int
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen_ids: set[str] = set()
        windows = list(_statement_windows(from_ts, to_ts))

        for window_from, window_to in windows:
            chunk = self.get_statement(account_id, window_from, window_to)
            for item in chunk:
                item_id = str(item.get("id", ""))
                if item_id and item_id in seen_ids:
                    continue
                if item_id:
                    seen_ids.add(item_id)
                items.append(item)

        return items

    def find_account(self, card_type: str) -> dict[str, Any]:
        return self.find_accounts((card_type,))[card_type]

    def find_accounts(
        self, card_types: tuple[str, ...]
    ) -> dict[str, dict[str, Any]]:
        info = self.get_client_info()
        accounts = info.get("accounts", [])
        found: dict[str, dict[str, Any]] = {}
        for card_type in card_types:
            matches = [account for account in accounts if account.get("type") == card_type]
            if not matches:
                available = sorted(
                    {account.get("type") for account in accounts if account.get("type")}
                )
                raise MonobankError(
                    f"No account with type {card_type!r}. Available types: {available}"
                )
            if len(matches) > 1:
                raise MonobankError(
                    f"Multiple accounts with type {card_type!r}; "
                    "specify a different filter."
                )
            found[card_type] = matches[0]
        return found

    def _wait_for_statement_slot(self) -> None:
        now = self._clock()
        if self._last_statement_at is not None:
            wait_seconds = RATE_LIMIT_SECONDS - (now - self._last_statement_at)
            if wait_seconds > 0:
                self._sleep(wait_seconds)
                now = self._clock()
        self._last_statement_at = now

    def _get(self, path: str) -> Any:
        url = f"{BASE_URL}{path}"
        try:
            response = self._session.get(url, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as exc:
            raise MonobankError(f"Request failed: {exc}") from exc

        if response.status_code == 429:
            raise MonobankRateLimitError(
                "Rate limit exceeded. Wait 60 seconds and retry."
            )
        if response.status_code == 401:
            raise MonobankUnauthorizedError("Unauthorized. Check MONOBANK_TOKEN.")
        if not response.ok:
            raise MonobankError(
                f"Monobank API error {response.status_code}: {response.text.strip()}"
            )

        return response.json()


def unix_to_kyiv(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=KYIV)


def _statement_windows(from_ts: int, to_ts: int) -> Iterator[tuple[int, int]]:
    current = from_ts
    while current <= to_ts:
        window_to = min(current + MAX_STATEMENT_SECONDS, to_ts)
        yield current, window_to
        if window_to >= to_ts:
            break
        current = window_to + 1
