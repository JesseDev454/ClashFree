import { expect, test } from '@playwright/test'

test('a new student registers, verifies, and signs in', async ({ page }) => {
  const email = `student.${Date.now()}@clashfree.test`
  await page.goto('/auth/register')
  await page.getByLabel('Full name').fill('Ada Tester')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('ClashFree!dev')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  const tokenResponse = await page.request.get(
    `/api/auth/debug/last-token?email=${encodeURIComponent(email)}`,
  )
  expect(tokenResponse.ok()).toBeTruthy()
  const token = (await tokenResponse.json()).token as string
  const verified = await page.request.post('/api/auth/verify-email', { data: { token } })
  expect(verified.ok()).toBeTruthy()
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('ClashFree!dev')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('heading', { name: 'My timetable, Ada Tester' }),
  ).toBeVisible({
    timeout: 20_000,
  })
})
