from monoscope.normalize import Expense
from monoscope.report import format_cli_report, format_markdown_report, summarize_by_category


def expense(
    item_id: str,
    *,
    category: str,
    eur: float,
    uah: float,
    hold: bool = False,
) -> Expense:
    return Expense(
        id=item_id,
        time=1_788_200_000,
        description="Synthetic merchant",
        comment="",
        mcc=5411,
        category=category,
        amount_original=uah,
        currency_original="UAH",
        amount_eur=eur,
        amount_uah=uah,
        rate_used=40.0,
        rate_source="nbu",
        hold=hold,
    )


def test_summary_aggregates_and_sorts_categories() -> None:
    rows = summarize_by_category(
        [
            expense("1", category="Продукти", eur=10.0, uah=400.0),
            expense("2", category="Книги", eur=25.0, uah=1000.0),
            expense("3", category="Продукти", eur=5.0, uah=200.0),
        ]
    )

    assert [(row.category, row.total_eur, row.total_uah, row.count) for row in rows] == [
        ("Книги", 25.0, 1000.0, 1),
        ("Продукти", 15.0, 600.0, 2),
    ]


def test_cli_and_markdown_reports_include_totals_and_pending_count() -> None:
    expenses = [
        expense("1", category="Продукти", eur=10.0, uah=400.0, hold=True),
        expense("2", category="Книги", eur=25.0, uah=1000.0),
    ]

    cli = format_cli_report(expenses, card_type="white", report_label="2026-09")
    markdown = format_markdown_report(
        expenses,
        card_type="white",
        report_label="2026-09",
    )

    assert "€35.00 / ₴1 400.00" in cli
    assert "У т.ч. очікуваних (hold): 1" in cli
    assert "**Всього витрат:** €35.00 / ₴1 400.00" in markdown
    assert "**Очікуваних (hold):** 1" in markdown


def test_empty_report_is_explicit() -> None:
    assert "Витрат не знайдено" in format_cli_report(
        [],
        card_type="white",
        report_label="2026-09",
    )
