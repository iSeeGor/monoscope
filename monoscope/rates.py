from __future__ import annotations

import time
from datetime import date, datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

import requests

KYIV = ZoneInfo("Europe/Kyiv")
NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange"
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 1.0


def _get_with_retries(url: str, params: dict | None = None) -> requests.Response:
    last_exc: requests.RequestException | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BACKOFF_SECONDS * (2 ** attempt))
    assert last_exc is not None
    raise last_exc

RateSource = Literal["operation", "nbu", "monobank"]


class RateLookupError(Exception):
    pass


class RateLookup:
    """Resolve UAH per 1 unit of foreign currency on a given date."""

    def __init__(self) -> None:
        self._nbu_cache: dict[date, dict[str, float]] = {}
        self._monobank_rates: list[dict] | None = None

    def uah_per_eur(self, on_date: date) -> tuple[float, RateSource]:
        rate = self._nbu_rate("EUR", on_date)
        if rate is not None:
            return rate, "nbu"

        rate = self._monobank_cross_rate(978, 980)
        if rate is not None:
            return rate, "monobank"

        raise RateLookupError(f"Could not resolve UAH/EUR rate for {on_date.isoformat()}")

    def uah_per_currency(self, currency_code: int, on_date: date) -> tuple[float, RateSource]:
        if currency_code == 980:
            return 1.0, "nbu"

        iso = _ISO_BY_CODE.get(currency_code)
        if iso:
            rate = self._nbu_rate(iso, on_date)
            if rate is not None:
                return rate, "nbu"

        rate = self._monobank_cross_rate(currency_code, 980)
        if rate is not None:
            return rate, "monobank"

        raise RateLookupError(
            f"Could not resolve UAH rate for currency {currency_code} on {on_date.isoformat()}"
        )

    def _nbu_rate(self, iso_code: str, on_date: date) -> float | None:
        for offset in range(0, 10):
            lookup_date = on_date - timedelta(days=offset)
            rates = self._fetch_nbu_day(lookup_date)
            if iso_code in rates:
                return rates[iso_code]
        return None

    def _fetch_nbu_day(self, on_date: date) -> dict[str, float]:
        if on_date in self._nbu_cache:
            return self._nbu_cache[on_date]

        params = {"date": on_date.strftime("%Y%m%d"), "json": ""}
        try:
            response = _get_with_retries(NBU_URL, params=params)
            payload = response.json()
        except (requests.RequestException, ValueError):
            self._nbu_cache[on_date] = {}
            return {}

        rates = {item["cc"]: float(item["rate"]) for item in payload if "cc" in item}
        self._nbu_cache[on_date] = rates
        return rates

    def _monobank_cross_rate(self, code_a: int, code_b: int) -> float | None:
        if self._monobank_rates is None:
            try:
                response = _get_with_retries("https://api.monobank.ua/bank/currency")
                self._monobank_rates = response.json()
            except (requests.RequestException, ValueError):
                self._monobank_rates = []

        for item in self._monobank_rates or []:
            if item.get("currencyCodeA") == code_a and item.get("currencyCodeB") == code_b:
                cross = item.get("rateCross")
                if cross:
                    return float(cross)
                # Fiat pairs, including EUR/UAH, normally publish bid/ask
                # prices instead of ``rateCross``.  We need the price of one
                # unit of A in B, so use the sell price (the conservative
                # conversion from UAH to the foreign currency).
                sell = item.get("rateSell")
                if sell:
                    return float(sell)
            if item.get("currencyCodeA") == code_b and item.get("currencyCodeB") == code_a:
                cross = item.get("rateCross")
                if cross:
                    return 1.0 / float(cross)
                buy = item.get("rateBuy")
                if buy:
                    return 1.0 / float(buy)
        return None


_ISO_BY_CODE = {
    978: "EUR",
    840: "USD",
    826: "GBP",
    985: "PLN",
}


def kyiv_date(ts: int) -> date:
    return datetime.fromtimestamp(ts, tz=KYIV).date()
