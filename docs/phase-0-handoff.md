# Phase 0 handoff

## Delivered

- Scope, 78-page inventory, unique routes, role assignments and permissions matrix.
- Design tokens in `docs/design-specification.md` and `frontend/src/index.css`.
- Original reference PNGs in `docs/design-references/` (not in `frontend/public`).
- Runnable Vite/React preview:
  - `/preview/admin/dashboard`
  - `/preview/components`
  - `/preview/unavailable/:pageId` for later-phase screens
- Shared components: Button, Input, Select, FilterBar, AppShell, Sidebar, Topbar, PageHeader, Card, MetricCard, DataTable, StatusBadge, ChartCard, TimetableGrid, Modal, ConfirmDialog.
- Local fixtures only. Generate / repair / publish are disabled.
- Formatting, lint, typecheck, Vitest, production build, Chromium Playwright (including axe and screenshots) and GitHub Actions.

## Preview URLs

- `/` → `/preview/admin/dashboard`
- `/preview/admin/dashboard`
- `/preview/components`

## Fixture behaviour

Dashboard metrics, disruptions, workload and session chip are constants in `frontend/src/fixtures/adminDashboard.ts`. They do not change unless the source file is edited. The preview banner now also calls `GET /health` (Phase 1). No credentials are required for the fixture values.

Phase 1 is documented in [phase-1-handoff.md](phase-1-handoff.md).

## Commands

See the root README. All listed npm scripts live in `frontend/package.json`.
