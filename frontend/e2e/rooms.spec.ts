import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('ClashFree!dev')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login$/, { timeout: 20_000 })
}

test('facilities manager creates a room', async ({ page }) => {
  const code = `E2E-${Date.now().toString().slice(-6)}`
  await signIn(page, 'facilities@clashfree.test')
  await page.goto('/facilities/rooms')
  await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible()
  await page.getByRole('link', { name: 'Add room' }).click()
  await page.getByLabel('Code').fill(code)
  await page.getByLabel('Building').fill('E2E Hall')
  await page.getByRole('button', { name: 'Save room' }).click()
  await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible()
  await expect(page.getByText(code)).toBeVisible()
})
