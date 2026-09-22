import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('ClashFree!dev')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login$/, { timeout: 20_000 })
}

test('administrator can export the current timetable version', async ({ page }) => {
  await signIn(page, 'admin@clashfree.test')
  await page.goto('/admin/timetable-versions')
  await expect(page.getByRole('heading', { name: 'Timetable Versions' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('button', { name: 'Export' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible()
})
