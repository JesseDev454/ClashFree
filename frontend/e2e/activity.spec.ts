import { expect, test } from '@playwright/test'

const password = 'ClashFree!dev'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login$/, { timeout: 20_000 })
}

test('student notifications show the student notice only', async ({ page }) => {
  await signIn(page, 'student@clashfree.test')
  await page.goto('/student/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByText('Phase 10 timetable notice')).toBeVisible()
  await expect(page.getByText('Phase 10 admin notice')).toHaveCount(0)
})

test('administrator audit log shows the seed summary', async ({ page }) => {
  await signIn(page, 'admin@clashfree.test')
  await page.goto('/admin/audit-log')
  await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('Phase 10 catalogue')).toBeVisible()
})

test('coordinator opens department reports', async ({ page }) => {
  await signIn(page, 'coordinator@clashfree.test')
  await page.goto('/coordinator/reports-analytics')
  await expect(page.getByRole('heading', { name: 'Reports & Analytics' })).toBeVisible()
  await expect(page.getByText('Meetings', { exact: true })).toBeVisible()
})

test('facilities opens room utilization', async ({ page }) => {
  await signIn(page, 'facilities@clashfree.test')
  await page.goto('/facilities/room-utilization')
  await expect(page.getByRole('heading', { name: 'Room Utilization' })).toBeVisible()
})
