# Web MVP Implementation Roadmap

## Delivery rules

- Keep every commit buildable and reviewable.
- Documentation and agent rules are committed before implementation.
- Protect current CLI behavior with tests before refactoring orchestration.
- Backend contracts land before frontend feature code.
- Do not add deferred product features while implementing the MVP.

## Phase 0 — specification

Deliver:

- product scope and acceptance criteria;
- architecture and API boundaries;
- UI system and responsive behavior;
- scoped Cursor rules.

Exit condition: documentation is committed on `feat/web-mvp` without runtime
changes.

## Phase 1 — protect and extract Python core

Deliver:

- root `pyproject.toml` with pytest and Ruff configuration;
- deterministic unit fixtures for statement data and exchange rates;
- tests for expense selection, hold deduplication, currency normalization,
  category summary, report context, and statement windows;
- UI-independent report parameter/result models;
- injected report service used by the existing CLI.

Constraints:

- no live API calls in tests;
- no CLI output or CSV column regressions;
- refactor only what is needed to create the service boundary.

Exit condition: existing CLI works and core tests pass.

## Phase 2 — FastAPI

Deliver:

- FastAPI application factory and `/api/v1` router;
- typed settings with server-only token;
- report request/response schemas;
- report generation endpoint;
- SQLite report cache and report exports;
- explicit exception mapping and request IDs;
- CORS restricted to configured local origins;
- API unit and integration tests;
- checked-in OpenAPI snapshot for frontend generation.

Exit condition: mocked API tests cover success, cache hit, validation,
unauthorized, rate limit, missing export, and generic upstream error.

## Phase 3 — frontend foundation

Deliver:

- Vite React/TypeScript application;
- route shell for overview, transactions, and settings;
- Tailwind and shadcn/ui token setup;
- generated API types/client;
- TanStack Query provider and API error handling;
- light/dark theme;
- initial, loading, empty, and error report states.

Exit condition: the application shell is responsive and can render mocked
report data without TypeScript or accessibility errors.

## Phase 4 — MVP screens

Deliver:

- report controls with URL-backed state;
- KPI cards;
- daily trend and category breakdown;
- recent transactions;
- transaction filtering, sorting, responsive table/list, and details sheet;
- CSV and Markdown download actions;
- responsive and dark-mode refinement.

Exit condition: all product acceptance criteria are met against a mocked API.

## Phase 5 — integration and handoff

Deliver:

- local development commands documented in README;
- frontend proxy or explicit API URL;
- end-to-end smoke test;
- lint, unit tests, builds, and OpenAPI drift check;
- manual verification using the configured local token without recording
  transaction data in test artifacts or logs.

Exit condition: a fresh checkout can start both applications and generate a
report by following README instructions.

## Planned commit sequence

1. `docs: define web MVP and agent rules`
2. `test: protect expense normalization and reporting`
3. `refactor: extract reusable report service`
4. `feat(api): add report API and local cache`
5. `feat(web): scaffold typed application shell`
6. `feat(web): implement report dashboard`
7. `feat(web): add transactions and exports`
8. `test: add web integration coverage`
9. `docs: document local web development`

Small corrections may be folded into the relevant commit. Do not combine
unrelated cleanup with these phases.

## Definition of done

- all automated checks pass;
- CLI compatibility is retained;
- no secret or personal transaction fixture is committed;
- OpenAPI and generated frontend types agree;
- core pages work at 360 px, 768 px, and 1440 px;
- keyboard navigation and axe checks pass;
- the branch contains no generated reports, database files, or `.env`;
- known limitations are documented instead of hidden.
