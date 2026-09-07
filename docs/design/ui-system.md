# UI System

## Experience direction

The interface is a modern financial workspace: calm, precise, and
information-first. It must feel trustworthy without copying Monobank branding.
Decoration is secondary to hierarchy, legibility, and fast comparison.

## Technology

- React and TypeScript with Vite;
- React Router for routes and URL-owned report filters;
- TanStack Query for server state;
- TanStack Table for transaction behavior;
- React Hook Form and Zod for forms;
- Tailwind CSS and shadcn/ui for the design-system foundation;
- Recharts behind project-owned chart components;
- Lucide icons;
- Vitest, Testing Library, axe, and Playwright for UI verification.

Do not introduce a second component framework. Add Zustand only if a concrete
cross-route client-state requirement cannot be handled by URL, query cache, or
local component state.

## Application shell

Desktop:

- collapsible left navigation;
- main content constrained to a readable maximum width;
- page title and report controls at the top;
- persistent theme control and API status indicator.

Mobile:

- compact top bar;
- bottom or drawer navigation;
- report controls in a sheet;
- charts and cards stack into one column;
- transaction table becomes a compact list.

## Overview composition

1. Page heading, selected period, and Generate controls.
2. KPI grid: UAH total, EUR total, operations, pending.
3. Daily spending trend across full width.
4. Category breakdown and recent transactions in a responsive two-column row.
5. Export actions near the report identity, not hidden in settings.

Prefer horizontal bars for category comparison. A donut may supplement them
only when labels and exact values remain visible elsewhere.

## Visual tokens

Use semantic CSS custom properties exposed through Tailwind:

- surfaces: `background`, `surface`, `surface-raised`;
- text: `foreground`, `muted-foreground`;
- borders and focus: `border`, `ring`;
- finance: `expense`, `income`, `pending`;
- charts: `chart-1` through `chart-8`, `chart-grid`, `chart-axis`;
- status: `success`, `warning`, `danger`, `info`.

Initial direction:

- neutral slate surfaces;
- restrained blue primary accent;
- warm red/orange for expenses and pending state;
- green reserved for income or success, never ordinary decoration;
- 8 px spacing rhythm;
- medium radii, subtle borders, minimal shadows;
- tabular numerals for all financial values.

Category colors must come from a deterministic token palette. Never encode a
category only by color.

## Typography and formatting

- use a high-legibility sans-serif available as a local or bundled web font;
- page headings are compact, not marketing-sized;
- use tabular numerals and non-breaking currency formatting;
- UAH is primary and EUR secondary unless the user later changes preferences;
- show full precision in details and consistent two-decimal display in totals;
- dates and labels are Ukrainian; code and identifiers remain English.

## Component boundaries

Project-owned primitives:

- `Money`;
- `DateRangeControl`;
- `MetricCard`;
- `StatusBadge`;
- `CardBadge`;
- `CategoryBarChart`;
- `SpendingTrendChart`;
- `ReportState`;
- `ExpenseTable`;
- `ExpenseList`;
- `ExpenseDetailsSheet`.

Page components compose these primitives but do not contain chart
configuration, API calls, or money-formatting rules.

Recharts usage must stay inside `shared/charts`. This preserves the option to
replace an individual visualization with ECharts when larger datasets or
advanced interactions justify it.

## Interaction states

Every data surface defines:

- initial state before a report is generated;
- skeleton loading state without layout shift;
- empty report state;
- stale cached-data indication while refreshing;
- unauthorized token guidance;
- upstream rate-limit guidance;
- retryable network failure;
- unexpected error with request ID.

Filters update draft state. Data is fetched only after Generate is pressed.
Sorting and local transaction filters must not refetch the report.

Report controls allow white-only, black-only, or combined card scope, with
white selected by default. Combined reports identify the source card in
transaction rows and expose a local card filter; single-card reports omit that
redundant filter.

## Accessibility

- meet WCAG 2.2 AA contrast targets;
- preserve visible focus indicators;
- all controls have accessible names and keyboard operation;
- status changes use appropriate live regions;
- charts have a text summary and equivalent tabular values;
- do not rely on hover for essential information;
- respect reduced-motion preferences;
- validate modified shadcn primitives with axe and keyboard tests.

## Responsive breakpoints

Design from these content behaviors rather than device names:

- below 640 px: one-column cards, compact expense list;
- 640–1023 px: two-column metrics, stacked analytical panels;
- 1024 px and above: sidebar, four KPI cards, two-column analytical panels.

No primary workflow may require horizontal page scrolling.

## Design review checklist

- hierarchy is clear in light and dark themes;
- UAH/EUR values align and scan easily;
- long Ukrainian labels and merchant names do not break layout;
- all states work at 360 px and 1440 px;
- category palettes remain distinguishable under common color-vision
  deficiencies;
- screenshots are checked against the intended tokens before UI work is
  considered complete.
