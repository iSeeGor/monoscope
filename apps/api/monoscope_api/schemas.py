from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from monoscope.rates import RateSource

KYIV = ZoneInfo("Europe/Kyiv")
CardType = Literal["white", "black"]
CARD_TYPE_ORDER: tuple[CardType, ...] = ("white", "black")


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class ReportRequest(ApiModel):
    model_config = ConfigDict(extra="forbid")

    card_types: list[CardType] = Field(
        default_factory=lambda: ["white"],
        min_length=1,
        max_length=2,
        json_schema_extra={"default": ["white"], "uniqueItems": True},
    )
    date_from: date
    date_to: date
    include_holds: bool = True

    @field_validator("card_types")
    @classmethod
    def validate_card_types(cls, card_types: list[CardType]) -> list[CardType]:
        if len(card_types) != len(set(card_types)):
            raise ValueError("cardTypes must not contain duplicates")
        return [card_type for card_type in CARD_TYPE_ORDER if card_type in card_types]

    @model_validator(mode="after")
    def validate_date_range(self) -> "ReportRequest":
        if self.date_to < self.date_from:
            raise ValueError("dateTo must be on or after dateFrom")
        if (self.date_to - self.date_from).days + 1 > 31:
            raise ValueError("Date range must not exceed 31 inclusive days")
        if self.date_to > datetime.now(KYIV).date():
            raise ValueError("dateTo must not be in the future")
        return self


class ReportMeta(ApiModel):
    card_types: (
        tuple[Literal["white"]]
        | tuple[Literal["black"]]
        | tuple[Literal["white"], Literal["black"]]
    )
    date_from: date
    date_to: date
    generated_at: datetime
    transaction_count: int
    pending_count: int
    total_uah: Decimal
    total_eur: Decimal


class CategorySummaryResponse(ApiModel):
    category: str
    total_uah: Decimal
    total_eur: Decimal
    share_pct: Decimal
    count: int


class DailySummaryResponse(ApiModel):
    date: date
    total_uah: Decimal
    total_eur: Decimal
    count: int


class ExpenseResponse(ApiModel):
    id: str
    occurred_at: datetime
    description: str
    comment: str
    mcc: int | None
    category: str
    amount_original: Decimal
    currency_original: str
    amount_uah: Decimal
    amount_eur: Decimal
    rate_used: Decimal | None
    rate_source: RateSource | None
    hold: bool
    card_type: Literal["white", "black"]


class ReportResponse(ApiModel):
    report_id: str
    cached: bool
    meta: ReportMeta
    categories: list[CategorySummaryResponse]
    daily: list[DailySummaryResponse]
    expenses: list[ExpenseResponse]


class HealthResponse(ApiModel):
    status: Literal["ok"]
    version: str


class ErrorBody(ApiModel):
    code: str
    message: str
    request_id: str
    details: dict[str, Any] | None = None


class ErrorResponse(ApiModel):
    error: ErrorBody


class CachedReport(ApiModel):
    response: ReportResponse
    report_label: str
    report_title: str
