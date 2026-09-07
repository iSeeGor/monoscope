from __future__ import annotations

import sqlite3
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from apps.api.monoscope_api.schemas import CachedReport


class ReportCache:
    def __init__(self, path: Path, ttl_seconds: int) -> None:
        self._path = path
        self._ttl_seconds = ttl_seconds
        self._locks: dict[str, threading.Lock] = {}
        self._locks_guard = threading.Lock()
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS report_cache (
                    cache_key TEXT PRIMARY KEY,
                    report_id TEXT NOT NULL UNIQUE,
                    payload TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    expires_at REAL NOT NULL
                )
                """
            )

    @contextmanager
    def lock(self, cache_key: str) -> Iterator[None]:
        with self._locks_guard:
            lock = self._locks.setdefault(cache_key, threading.Lock())
        with lock:
            yield

    def get_by_key(self, cache_key: str) -> CachedReport | None:
        return self._get("cache_key", cache_key)

    def get_by_report_id(self, report_id: str) -> CachedReport | None:
        return self._get("report_id", report_id)

    def _get(self, column: str, value: str) -> CachedReport | None:
        now = time.time()
        with self._connect() as connection:
            row = connection.execute(
                f"""
                SELECT payload
                FROM report_cache
                WHERE {column} = ? AND expires_at > ?
                """,
                (value, now),
            ).fetchone()
            connection.execute(
                "DELETE FROM report_cache WHERE expires_at <= ?",
                (now,),
            )
        if row is None:
            return None
        return CachedReport.model_validate_json(row["payload"])

    def put(self, cache_key: str, report: CachedReport) -> None:
        now = time.time()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO report_cache (
                    cache_key,
                    report_id,
                    payload,
                    created_at,
                    expires_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    cache_key,
                    report.response.report_id,
                    report.model_dump_json(by_alias=True),
                    now,
                    now + self._ttl_seconds,
                ),
            )
