# Phase 14 handoff

Department coordinators can generate a timetable and repair open disruptions for their own department. A faculty or foreign department on generate is 403. Repair can target one disruption or every open disruption in the department. Meetings outside the impact set are hard-pinned on `snapshot.locked`. Batch ids are stored on `timetable_runs.disruption_ids`, and publish marks each of them repaired. Publishing stays administrator-only. `docs/scope.md` and `docs/permissions-matrix.md` match this contract.

Seed with `uv run python -m app.cli seed_phase14`. Playwright: `npm run test:e2e:solver-access` on port 4185.
