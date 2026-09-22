# Phase 15 handoff

Neon Auth is optional. When `NEON_AUTH_ISSUER`, `NEON_AUTH_AUDIENCE`, and `NEON_AUTH_JWKS_URL` are all set, `POST /api/auth/neon` verifies a JWT and opens a ClashFree session for the user whose `auth_subject` matches `sub`. Unknown subjects are 401. Users with no password hash cannot use password login. Registration, forgot-password, and reset return 501. When the three settings are empty, email/password stays as it is, including in CI.

`users.password_hash` is nullable. Seed with `uv run python -m app.cli seed_phase15`. Playwright: `npm run test:e2e:identity` on port 4186.
