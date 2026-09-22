# Phase 13 handoff

`POST /api/auth/register` creates an unverified student. A role field is rejected. Login stays blocked until `POST /api/auth/verify-email` consumes the existing email token. Staff accounts stay administrator-provisioned. Registration returns 501 when Neon Auth is configured.

Seed with `uv run python -m app.cli seed_phase13`. Playwright: `npm run test:e2e:registration` on port 4184.
