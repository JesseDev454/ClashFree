# Phase 11 handoff

Facilities managers can list, create, edit, and delete rooms at `/facilities/rooms` and `/facilities/rooms/edit`. The screens use the existing `/api/rooms` endpoints. The administrator rooms screen is unchanged.

Seed with `uv run python -m app.cli seed_phase11`. Playwright: `npm run test:e2e:rooms` on port 4182.
