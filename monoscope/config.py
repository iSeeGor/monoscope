from __future__ import annotations

import os
from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

KYIV = ZoneInfo("Europe/Kyiv")
DATE_FORMAT = "%Y-%m-%d"

CURRENCY_CODES = {
    980: "UAH",
    978: "EUR",
    840: "USD",
    826: "GBP",
    985: "PLN",
}


@dataclass(frozen=True)
class Config:
    token: str
    card_type: str
    month_start: datetime
    month_end: datetime
    output_dir: str
    include_holds: bool = True
    use_date_range: bool = False

    @property
    def report_label(self) -> str:
        if self.use_date_range:
            return (
                f"{self.month_start.strftime(DATE_FORMAT)}_"
                f"{self.month_end.strftime(DATE_FORMAT)}"
            )
        return self.month_start.strftime("%Y-%m")

    @property
    def report_title(self) -> str:
        if self.use_date_range:
            return (
                f"{self.month_start.strftime(DATE_FORMAT)} — "
                f"{self.month_end.strftime(DATE_FORMAT)}"
            )
        return self.month_start.strftime("%Y-%m")

    @property
    def from_unix(self) -> int:
        return int(self.month_start.timestamp())

    @property
    def to_unix(self) -> int:
        return int(self.month_end.timestamp())


def _parse_env_date(name: str, raw: str) -> date:
    try:
        return datetime.strptime(raw, DATE_FORMAT).date()
    except ValueError as exc:
        raise ValueError(
            f"Invalid {name}={raw!r}. Expected format YYYY-MM-DD."
        ) from exc


def _day_start(value: date) -> datetime:
    return datetime(value.year, value.month, value.day, 0, 0, 0, tzinfo=KYIV)


def _day_end(value: date, *, now: datetime) -> datetime:
    end = datetime(value.year, value.month, value.day, 23, 59, 59, tzinfo=KYIV)
    if value == now.date():
        return min(end, now)
    return end


def load_config() -> Config:
    load_dotenv()

    token = os.getenv("MONOBANK_TOKEN", "").strip()
    if not token:
        raise ValueError(
            "MONOBANK_TOKEN is not set. Copy .env.example to .env and add your token."
        )

    card_type = os.getenv("CARD_TYPE", "white").strip().lower()
    output_dir = os.getenv("OUTPUT_DIR", "./output").strip()
    report_from = os.getenv("REPORT_FROM", "").strip()
    report_to = os.getenv("REPORT_TO", "").strip()
    report_month = os.getenv("REPORT_MONTH", "").strip()
    now = datetime.now(KYIV)

    include_holds = os.getenv("INCLUDE_HOLDS", "true").strip().lower() not in {
        "0",
        "false",
        "no",
    }

    if report_from or report_to:
        if not report_from or not report_to:
            raise ValueError(
                "Set both REPORT_FROM and REPORT_TO (YYYY-MM-DD), or use REPORT_MONTH."
            )
        start_date = _parse_env_date("REPORT_FROM", report_from)
        end_date = _parse_env_date("REPORT_TO", report_to)
        if end_date < start_date:
            raise ValueError("REPORT_TO must be on or after REPORT_FROM.")

        return Config(
            token=token,
            card_type=card_type,
            month_start=_day_start(start_date),
            month_end=_day_end(end_date, now=now),
            output_dir=output_dir,
            include_holds=include_holds,
            use_date_range=True,
        )

    if report_month:
        try:
            year, month = map(int, report_month.split("-"))
            datetime(year, month, 1)
        except ValueError as exc:
            raise ValueError(
                f"Invalid REPORT_MONTH={report_month!r}. Expected format YYYY-MM."
            ) from exc
    else:
        year, month = now.year, now.month

    last_day = monthrange(year, month)[1]
    month_start = datetime(year, month, 1, 0, 0, 0, tzinfo=KYIV)
    month_end = datetime(year, month, last_day, 23, 59, 59, tzinfo=KYIV)
    if year == now.year and month == now.month:
        month_end = now

    return Config(
        token=token,
        card_type=card_type,
        month_start=month_start,
        month_end=month_end,
        output_dir=output_dir,
        include_holds=include_holds,
        use_date_range=False,
    )
