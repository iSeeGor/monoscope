from __future__ import annotations

from pathlib import Path

import click

from monoscope.config import load_config
from monoscope.monobank import MonobankClient, MonobankError
from monoscope.normalize import normalize_expenses
from monoscope.rates import RateLookup
from monoscope.report import format_cli_report, write_csv, write_markdown_report


@click.command()
@click.option(
    "--csv",
    "csv_path",
    type=click.Path(path_type=Path),
    default=None,
    help="Custom CSV output path.",
)
@click.option(
    "--md",
    "md_path",
    type=click.Path(path_type=Path),
    default=None,
    help="Custom Markdown report path.",
)
def main(csv_path: Path | None, md_path: Path | None) -> None:
    """Fetch Monobank expenses and print a EUR summary."""
    try:
        config = load_config()
    except ValueError as exc:
        raise click.ClickException(str(exc)) from exc

    client = MonobankClient(config.token)

    try:
        account = client.find_account(config.card_type)
        items = client.get_statement_range(
            account["id"], config.from_unix, config.to_unix
        )
    except MonobankError as exc:
        raise click.ClickException(str(exc)) from exc

    rates = RateLookup()
    expenses = normalize_expenses(items, rates, include_holds=config.include_holds)

    click.echo(
        format_cli_report(
            expenses,
            card_type=config.card_type,
            report_label=config.report_title,
        )
    )

    if csv_path is None:
        csv_path = Path(config.output_dir) / f"expenses_{config.report_label}.csv"
    if md_path is None:
        md_path = Path(config.output_dir) / f"expenses_{config.report_label}.md"

    csv_output = write_csv(expenses, csv_path)
    md_output = write_markdown_report(
        expenses,
        md_path,
        card_type=config.card_type,
        report_label=config.report_title,
    )
    click.echo("")
    click.echo(f"CSV: {csv_output.resolve()}")
    click.echo(f"MD:  {md_output.resolve()}")


if __name__ == "__main__":
    main()
