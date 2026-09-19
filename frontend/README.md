# ClashFree frontend

Phase 2 production routes sit behind session cookies. Leave `VITE_API_BASE_URL` empty so Vite proxies `/api` and `/health` to FastAPI. Preview URLs under `/preview` stay unauthenticated for visual tests.

```bash
npm ci
npm run dev
```

Use the repository root README for seed accounts, URLs and the full check sequence.
