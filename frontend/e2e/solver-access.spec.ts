import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('ClashFree!dev')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login$/, { timeout: 20_000 })
}

test('coordinator opens department generate', async ({ page }) => {
  await signIn(page, 'coordinator@clashfree.test')
  await page.goto('/coordinator/generate-timetable')
  await expect(page.getByRole('heading', { name: 'Generate timetable' })).toBeVisible()
})

test('lecturer cannot open department generate', async ({ page }) => {
  await signIn(page, 'lecturer@clashfree.test')
  await page.goto('/coordinator/generate-timetable')
  await expect(
    page.getByRole('heading', { name: /You don.t have access to that page/ }),
  ).toBeVisible()
})
