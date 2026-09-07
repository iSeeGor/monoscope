from __future__ import annotations

import csv
import io
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from monoscope.normalize import Expense

KYIV = ZoneInfo("Europe/Kyiv")


@dataclass(frozen=True)
class CategorySummary:
    category: str
    total_eur: float
    total_uah: float
    count: int

    @property
    def share_pct(self) -> float:
        return 0.0


def summarize_by_category(expenses: list[Expense]) -> list[CategorySummary]:
    totals: dict[str, tuple[float, float, int]] = defaultdict(lambda: (0.0, 0.0, 0))
    for expense in expenses:
        total_eur, total_uah, count = totals[expense.category]
        totals[expense.category] = (
            total_eur + expense.amount_eur,
            total_uah + expense.amount_uah,
            count + 1,
        )

    rows = [
        CategorySummary(
            category=cat,
            total_eur=round(total_eur, 2),
            total_uah=round(total_uah, 2),
            count=count,
        )
        for cat, (total_eur, total_uah, count) in totals.items()
    ]
    rows.sort(key=lambda r: r.total_eur, reverse=True)
    return rows


def _format_eur(amount: float) -> str:
    return f"€{amount:,.2f}".replace(",", " ")


def _format_uah(amount: float) -> str:
    return f"₴{amount:,.2f}".replace(",", " ")


def _report_context(
    expenses: list[Expense],
    *,
    card_type: str,
    report_label: str,
) -> tuple[str, str, float, float, int, int, list[tuple[CategorySummary, float]]]:
    if not expenses:
        return report_label, card_type, 0.0, 0.0, 0, 0, []

    total_eur = sum(e.amount_eur for e in expenses)
    total_uah = sum(e.amount_uah for e in expenses)
    categories = summarize_by_category(expenses)
    pending = sum(1 for expense in expenses if expense.hold)
    rows = [
        (row, (row.total_eur / total_eur * 100) if total_eur else 0.0)
        for row in categories
    ]
    return report_label, card_type, total_eur, total_uah, len(expenses), pending, rows


def format_cli_report(
    expenses: list[Expense],
    *,
    card_type: str,
    report_label: str,
) -> str:
    label, card, total_eur, total_uah, count, pending, rows = _report_context(
        expenses, card_type=card_type, report_label=report_label
    )

    if not expenses:
        return f"Період: {label}\nКартка: {card}\nВитрат не знайдено."

    lines = [
        f"Період: {label}",
        f"Картка: {card}",
        f"Всього витрат: {_format_eur(total_eur)} / {_format_uah(total_uah)}",
        f"Операцій: {count}",
    ]
    if pending:
        lines.append(f"У т.ч. очікуваних (hold): {pending}")
    lines.extend(
        [
            "",
            f"{'Категорія':<22} {'Сума EUR':>10} {'Сума UAH':>12} {'%':>6} {'К-сть':>6}",
            "─" * 62,
        ]
    )

    for row, pct in rows:
        lines.append(
            f"{row.category:<22} {_format_eur(row.total_eur):>10} "
            f"{_format_uah(row.total_uah):>12} {pct:>5.0f}% {row.count:>6}"
        )

    return "\n".join(lines)


def format_markdown_report(
    expenses: list[Expense],
    *,
    card_type: str,
    report_label: str,
) -> str:
    label, card, total_eur, total_uah, count, pending, rows = _report_context(
        expenses, card_type=card_type, report_label=report_label
    )

    if not expenses:
        return "\n".join(
            [
                "# Витрати Monobank",
                "",
                f"- **Період:** {label}",
                f"- **Картка:** {card}",
                "",
                "Витрат не знайдено.",
            ]
        )

    lines = [
        "# Витрати Monobank",
        "",
        f"- **Період:** {label}",
        f"- **Картка:** {card}",
        f"- **Всього витрат:** {_format_eur(total_eur)} / {_format_uah(total_uah)}",
        f"- **Операцій:** {count}",
    ]
    if pending:
        lines.append(f"- **Очікуваних (hold):** {pending}")

    lines.extend(
        [
            "",
            "## За категоріями",
            "",
            "| Категорія | Сума EUR | Сума UAH | % | К-сть |",
            "| --- | ---: | ---: | ---: | ---: |",
        ]
    )

    for row, pct in rows:
        lines.append(
            f"| {row.category} | {_format_eur(row.total_eur)} | "
            f"{_format_uah(row.total_uah)} | {pct:.0f}% | {row.count} |"
        )

    return "\n".join(lines) + "\n"


def write_markdown_report(
    expenses: list[Expense],
    path: Path,
    *,
    card_type: str,
    report_label: str,
) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        format_markdown_report(
            expenses,
            card_type=card_type,
            report_label=report_label,
        ),
        encoding="utf-8",
    )
    return path


def format_csv(expenses: list[Expense]) -> str:
    fieldnames = [
        "date",
        "time",
        "description",
        "comment",
        "category",
        "mcc",
        "amount_original",
        "currency_original",
        "amount_eur",
        "rate_used",
        "rate_source",
        "hold",
        "id",
        "card_type",
    ]

    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for expense in expenses:
        dt = datetime.fromtimestamp(expense.time, tz=KYIV)
        writer.writerow(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "time": dt.strftime("%H:%M:%S"),
                "description": expense.description,
                "comment": expense.comment,
                "category": expense.category,
                "mcc": expense.mcc or "",
                "amount_original": f"{expense.amount_original:.2f}",
                "currency_original": expense.currency_original,
                "amount_eur": f"{expense.amount_eur:.2f}",
                "rate_used": (
                    f"{expense.rate_used:.4f}" if expense.rate_used is not None else ""
                ),
                "rate_source": expense.rate_source or "",
                "hold": "true" if expense.hold else "false",
                "id": expense.id,
                "card_type": expense.card_type,
            }
        )
    return output.getvalue()


def write_csv(expenses: list[Expense], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(format_csv(expenses), encoding="utf-8")

    return path
