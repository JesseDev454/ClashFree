import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const dirname = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.VERSIONS_E2E_PORT ?? 4183)
const apiPort = Number(process.env.VERSIONS_API_PORT ?? 8000)
const baseURL = `http://127.0.0.1:${port}`
const apiOrigin = `http://127.0.0.1:${apiPort}`
const backendDir = path.resolve(dirname, '../backend')
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql+psycopg://clashfree:clashfree@127.0.0.1:5433/clashfree'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['versions.spec.ts'],
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `uv run uvicorn app.main:app --host 127.0.0.1 --port ${apiPort}`,
      cwd: backendDir,
      url: `${apiOrigin}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        AUTH_DEBUG: 'true',
        SESSION_SECRET: process.env.SESSION_SECRET ?? 'playwright-session-secret',
        COOKIE_SECURE: 'false',
        APP_ORIGIN: baseURL,
        SEED_PASSWORD: process.env.SEED_PASSWORD ?? 'ClashFree!dev',
      },
    },
    {
      command: `npm run preview -- --host 127.0.0.1 --port ${port}`,
      url: baseURL,
      env: {
        ...process.env,
        API_PROXY_TARGET: apiOrigin,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
