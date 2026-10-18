# Monoscope Web MVP

## Product intent

Monoscope Web is a local, single-user financial dashboard for reviewing
Monobank expenses. It reuses the existing, trusted Python normalization and
reporting logic and adds a responsive browser interface.

The MVP optimizes for:

- a useful report in less than one minute for a normal monthly period;
- keeping the Monobank token on the local backend;
- parity with the existing CLI calculations;
- clear extension points for history, budgets, custom category rules, and
  multi-user hosting later.

## Target user

The first release is for one person running the API and web app locally. There
is no registration, remote account, or shared workspace in the MVP.

## Primary workflow

1. Open the dashboard.
2. Choose a month or custom date range, one or both supported cards, and
   whether to include pending operations.
3. Generate the report.
4. Review totals, category distribution, daily trend, and transactions.
5. Search, filter, and sort transactions.
6. Download the current result as CSV or Markdown.

## MVP capabilities

### Overview

- total expenses in UAH and EUR;
- transaction count;
- pending `hold` count;
- ranked category breakdown with amounts, share, and count;
- daily spending trend;
- recent transactions;
- visible report period and included cards.

### Transactions

- searchable description and comment;
- category and status filters;
- UAH and EUR total plus operation count for the transactions left by the
  current filters;
- date and amount sorting;
- responsive table on desktop;
- compact cards or rows on small screens;
- transaction details panel;
- clear pending-operation badge.

### FOP accounts

- current balance, currency, and IBAN for every available FOP account;
- a complete statement with both incoming and outgoing transactions;
- the last 30 inclusive days by default and a custom range up to 31 days;
- local direction filtering without another API request;
- payment details including counterparty, EDRPOU, IBAN, purpose, operation
  amount, balance after the transaction, and invoice or receipt identifiers.

### Report controls

- month picker;
- custom inclusive date range, limited to 31 days in the first web release;
- explicit white, black, or combined card scope; white is the default;
- include-pending toggle;
- explicit Generate action;
- URL query parameters for shareable/reloadable filter state.

### Export

- CSV with the existing CLI-compatible columns;
- Markdown summary compatible with the current report;
- export must use the exact data displayed in the UI.

## Explicit non-goals

- user registration or multi-user tenancy;
- cloud synchronization;
- editing categories and category rules;
- budgets, goals, alerts, and forecasts;
- importing other banks;
- periods longer than 31 days in the web UI;
- Redis, distributed workers, or PostgreSQL;
- replacing the existing CLI.

These are deferred, not prohibited. Public contracts and module boundaries
must not make them unnecessarily difficult to add.

## Routes

- `/overview` — report controls, KPIs, charts, and recent transactions;
- `/transactions` — full filterable transaction list;
- `/accounts` — FOP balances and complete account statements;
- `/settings` — local display preferences and diagnostics; a minimal shell in
  the MVP is acceptable.

The root route redirects to `/overview`.

## Quality and acceptance criteria

- the CLI continues to work;
- API and CLI totals match for the same source data and parameters;
- the token never appears in browser storage, URLs, logs, or API responses;
- loading, empty, rate-limit, unauthorized, offline, and generic error states
  are understandable and actionable;
- all core flows are keyboard accessible;
- layout works from 360 px mobile width through large desktop screens;
- light and dark themes use the same semantic design tokens;
- backend domain tests cover hold deduplication, currency normalization,
  categorization, summaries, and date ranges;
- one browser smoke test covers generating and viewing a report with mocked
  API responses.

## Future growth order

1. Editable category overrides and matching rules.
2. Persistent history and period comparison.
3. Budgets and category limits.
4. Background jobs for periods longer than 31 days.
5. Additional banks and import formats.
6. Optional authentication and hosted multi-user deployment.
