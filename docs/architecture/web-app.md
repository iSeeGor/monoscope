# Web Application Architecture

## Decision

Use the existing Python package as the source of truth for financial
calculations. Add a FastAPI adapter and an independent React/TypeScript SPA.
Do not rewrite domain behavior in TypeScript.

## Repository layout

```text
monoscope/                  Existing Python package and domain behavior
  service.py                UI-independent report use case
apps/
  api/
    monoscope_api/
      main.py               FastAPI application factory
      settings.py           Server-only environment settings
      dependencies.py       Dependency composition
      routers/              Versioned HTTP adapters
      schemas/              Pydantic request/response models
      cache.py              SQLite report cache
      errors.py             Stable public error mapping
    tests/
  web/
    src/
      app/                  Router, providers, global styles
      pages/                Route-level composition
      features/             Report controls, filters, exports
      entities/             Expense, category, report UI
      shared/               Generated API, UI primitives, charts
    tests/
tests/                      Existing package tests
docs/                       Product and technical decisions
```

Keep the current `monoscope` import path and CLI entry point stable. Moving the
Python package into another directory is unnecessary churn for the MVP.

## Dependency direction

```text
React UI -> HTTP/OpenAPI -> FastAPI adapters -> report service
                                             -> existing domain functions
                                             -> Monobank and NBU clients
```

- Domain and report service code must not import FastAPI, Pydantic, SQLite, or
  frontend concepts.
- FastAPI maps HTTP schemas to domain parameters and maps domain results back
  to response schemas.
- The frontend consumes generated OpenAPI types and does not duplicate Python
  calculation rules.
- Exporters consume a completed report result; they must not independently
  refetch or recalculate it.

## Report service

Extract the orchestration currently in `monoscope/cli.py` into one reusable
service:

```python
ReportParams(
    card_types,
    from_timestamp,
    to_timestamp,
    include_holds,
    report_label,
)

ReportResult(
    expenses,
    category_summary,
    totals,
    metadata,
)
```

The CLI and API both call this service. Client and rate providers are injected
so tests can use deterministic fakes without network access.

## Web request lifecycle

1. FastAPI validates the request and inclusive date range.
2. The API creates a cache key from included cards, range, pending flag, application
   calculation version, and a one-way token fingerprint.
3. A fresh cached report is returned when available.
4. Otherwise the report service resolves all requested accounts with one
   client-info lookup. It fetches and normalizes each card statement separately,
   tags every normalized expense with its source card, then merges and sorts
   the expenses before summarizing and storing the serialized result.
5. FastAPI returns the report with a stable report ID.
6. Export endpoints read the same cached report by ID.

The MVP web API accepts at most 31 inclusive days. The existing CLI retains
long-range chunking. A later job queue can remove the web limit without
changing report response contracts.

## SQLite cache

Use the Python standard library `sqlite3` behind a small repository interface.
Default location: `./data/monoscope.db`, configurable with
`MONOSCOPE_DB_PATH`. The `data/` directory is ignored by Git.

Store:

- report ID and deterministic cache key;
- request parameters;
- serialized report payload;
- creation and expiry timestamps;
- calculation schema version.

Defaults:

- completed report TTL: 10 minutes;
- stale rows may be deleted opportunistically;
- never persist the raw Monobank token;
- use a SHA-256 token fingerprint only as one cache-key component.

SQLite is an implementation detail. The cache interface must allow a later
Redis or PostgreSQL implementation.

## Concurrency and rate limits

The current Monobank client is synchronous and enforces the statement cooldown
between every sequential statement request made by one client, including
requests for different cards. The 31-day web limit ensures one statement window
per card. FastAPI may run the blocking report service in its worker thread pool.

Web reports always include the white card and optionally include the black card.
The optional path is atomic: an upstream failure for either card aborts the
whole report, so no partial result is written to the cache.

Prevent duplicate simultaneous requests for the same cache key with an
in-process keyed lock. This is sufficient for the supported one-process local
deployment. Document that multiple API workers are unsupported in the MVP.

Do not hide Monobank `401` or `429` failures. Map them to stable API errors and
show specific recovery guidance in the UI.

## Configuration and security

Server-only variables:

- `MONOBANK_TOKEN` — required;
- `MONOSCOPE_DB_PATH` — defaults to `./data/monoscope.db`;
- `MONOSCOPE_CACHE_TTL_SECONDS` — defaults to `600`;
- `MONOSCOPE_CORS_ORIGINS` — defaults to the local Vite origin;
- `MONOSCOPE_LOG_LEVEL` — defaults to `INFO`.

Browser variables:

- `VITE_API_BASE_URL` — defaults to `http://localhost:8000/api/v1`.

Security rules:

- bind development services to localhost by default;
- never return settings or secret values;
- redact authorization headers and query strings in logs;
- do not place the token in Vite variables;
- use explicit CORS origins, never wildcard credentials;
- validate date span and enum values on the server;
- include a request ID in logs and public errors.

## Money and time contracts

- Internally preserve current calculation behavior until parity tests exist.
- API money values are decimal strings with two fractional digits, never
  binary JSON numbers.
- API timestamps use ISO 8601 with an explicit `Europe/Kyiv` offset.
- Date inputs use `YYYY-MM-DD` and are inclusive.
- Percentages are decimal strings; the frontend only formats them.
- Any future migration from floats to `Decimal` must be guarded by report
  parity fixtures.

## Observability and errors

Use structured logs containing request ID, route, duration, cache result, and
upstream status. Never log transaction payloads by default.

Public error shape:

```json
{
  "error": {
    "code": "MONOBANK_RATE_LIMITED",
    "message": "Monobank request limit reached.",
    "requestId": "..."
  }
}
```

Expected codes include `VALIDATION_ERROR`, `MONOBANK_UNAUTHORIZED`,
`MONOBANK_RATE_LIMITED`, `MONOBANK_UNAVAILABLE`, `REPORT_NOT_FOUND`, and
`INTERNAL_ERROR`.

## Evolution path

- Long reports: introduce a `ReportJobRunner` interface and durable queue.
- History: separate immutable statement storage from short-lived report cache.
- Category editing: add user-owned override rules before the base MCC mapping.
- Multiple users: add user/account ownership at API and persistence boundaries.
- Additional banks: implement statement-provider adapters behind the report
  service interface.
