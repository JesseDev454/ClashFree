import { defineConfig, devices } from '@playwright/test'

const port = 4173
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  testIgnore: [
    '**/auth.spec.ts',
    '**/academic.spec.ts',
    '**/constraints.spec.ts',
    '**/solver.spec.ts',
    '**/publish.spec.ts',
    '**/disruptions.spec.ts',
    '**/repair.spec.ts',
    '**/portals.spec.ts',
    '**/activity.spec.ts',
    '**/rooms.spec.ts',
    '**/versions.spec.ts',
    '**/registration.spec.ts',
    '**/solver-access.spec.ts',
    '**/identity.spec.ts',
  ],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Windows-generated baselines vs Ubuntu CI Chromium (font rasterisation).
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
