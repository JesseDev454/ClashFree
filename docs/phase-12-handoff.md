# Phase 12 handoff

Administrators can export a timetable version as CSV, print the versions page, unpublish the current version, and restore any version as a selected draft. Unpublish notifies administrators. Restore does not email anyone until the draft is published. Status `unpublished` needs no migration.

Seed with `uv run python -m app.cli seed_phase12`, which records one current version and one superseded version without the solver. Playwright: `npm run test:e2e:versions` on port 4183.
