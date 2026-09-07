from __future__ import annotations

from pathlib import Path

import click

from monoscope.config import load_config
from monoscope.monobank import MonobankClient, MonobankError
from monoscope.rates import RateLookup
from monoscope.report import format_cli_report, write_csv, write_markdown_report
from monoscope.service import ReportParams, ReportService


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

    service = ReportService(MonobankClient(config.token), RateLookup())
    params = ReportParams(
        card_types=(config.card_type,),
        from_timestamp=config.from_unix,
        to_timestamp=config.to_unix,
        include_holds=config.include_holds,
        report_label=config.report_label,
        report_title=config.report_title,
    )

    try:
        report = service.generate(params)
    except MonobankError as exc:
        raise click.ClickException(str(exc)) from exc

    expenses = report.expenses

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
