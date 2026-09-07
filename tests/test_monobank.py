from monoscope.monobank import MAX_STATEMENT_SECONDS, _statement_windows


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
