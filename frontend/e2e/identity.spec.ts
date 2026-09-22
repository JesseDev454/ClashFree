import { expect, test } from '@playwright/test'

test('password sign-in still opens the administrator dashboard', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill('admin@clashfree.test')
  await page.getByLabel('Password').fill('ClashFree!dev')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login$/, { timeout: 20_000 })
  await expect(
    page.getByRole('heading', { name: 'Welcome back, Ada Okonkwo' }),
  ).toBeVisible()
})
