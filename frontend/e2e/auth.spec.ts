import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const backendDir = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../backend',
)
const password = 'ClashFree!dev'

const accounts = [
  {
    email: 'admin@clashfree.test',
    path: /\/admin\/dashboard$/,
    heading: /Welcome back, Ada Okonkwo/,
  },
  {
    email: 'coordinator@clashfree.test',
    path: /\/coordinator\/dashboard$/,
    heading: /Department workspace, Chinedu Bello/,
  },
  {
    email: 'lecturer@clashfree.test',
    path: /\/lecturer\/dashboard$/,
    heading: /Teaching workspace, Dr\. Amina Yusuf/,
  },
  {
    email: 'facilities@clashfree.test',
    path: /\/facilities\/dashboard$/,
    heading: /Facilities workspace, Ibrahim Musa/,
  },
  {
    email: 'student@clashfree.test',
    path: /\/student\/dashboard$/,
    heading: /My timetable, Ngozi Eze/,
  },
] as const

async function signIn(
  page: import('@playwright/test').Page,
  email: string,
  secret = password,
) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(secret)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe.configure({ mode: 'serial' })

test.describe('seeded role logins', () => {
  for (const account of accounts) {
    test(`${account.email} lands on the role dashboard`, async ({ page }) => {
      await signIn(page, account.email)
      await expect(page).toHaveURL(account.path)
      await expect(page.getByRole('heading', { name: account.heading })).toBeVisible()
    })
  }
})

test('lecturer and student cannot stay on the administrator dashboard', async ({
  page,
}) => {
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/forbidden$/)

  await page.context().clearCookies()
  await signIn(page, 'student@clashfree.test')
  await expect(page).toHaveURL(/\/student\/dashboard$/)
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/forbidden$/)
})

test('lecturer generate requests are rejected with 403', async ({ page }) => {
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  const response = await page.request.post('/api/timetables/generate')
  expect(response.status()).toBe(403)
})

test('forgot-password completes with the debug token', async ({ page }) => {
  await page.goto('/auth/forgot-password')
  await page.getByLabel('Email').fill('student@clashfree.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page).toHaveURL(/\/auth\/verify-email/)
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()

  const debug = await page.request.get('/api/auth/debug/last-token', {
    params: { email: 'student@clashfree.test' },
  })
  expect(debug.status()).toBe(200)
  const payload = (await debug.json()) as { token: string }
  expect(payload.token).toBeTruthy()

  await page.goto(`/auth/reset-password?token=${payload.token}`)
  await page.getByLabel('New password').fill('ClashFree!reset1')
  await page.getByLabel('Confirm password').fill('ClashFree!reset1')
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page).toHaveURL(/\/auth\/reset-success$/)

  await signIn(page, 'student@clashfree.test', 'ClashFree!reset1')
  await expect(page).toHaveURL(/\/student\/dashboard$/)

  execSync('uv run python -m app.cli seed_phase2', {
    cwd: backendDir,
    env: process.env,
    stdio: 'inherit',
  })
})
