import { expect, test } from '@playwright/test'

const password = 'ClashFree!dev'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login$/, { timeout: 20_000 })
}

test('coordinator department timetable stays inside the department', async ({ page }) => {
  await signIn(page, 'coordinator@clashfree.test')
  await page.goto('/coordinator/department-timetable')
  await expect(page.getByRole('heading', { name: 'Department Timetable' })).toBeVisible()
  await expect(page.getByText('CSC 312')).toHaveCount(0)
})

test('student opens my timetable and today', async ({ page }) => {
  await signIn(page, 'student@clashfree.test')
  await page.goto('/student/my-timetable')
  await expect(page.getByRole('heading', { name: 'My Timetable' })).toBeVisible()
  await page.goto('/student/today')
  await expect(page.getByRole('heading', { name: "Today's Schedule" })).toBeVisible()
})

test('lecturer opens my courses', async ({ page }) => {
  await signIn(page, 'lecturer@clashfree.test')
  await page.goto('/lecturer/my-courses')
  await expect(page.getByRole('heading', { name: 'My Courses' })).toBeVisible()
  await expect(page.getByText('SWE 301')).toBeVisible()
})

test('administrator sees seed accounts on users and roles', async ({ page }) => {
  await signIn(page, 'admin@clashfree.test')
  await page.goto('/admin/users-roles')
  await expect(page.getByRole('heading', { name: 'Users & Roles' })).toBeVisible()
  await expect(page.getByText('admin@clashfree.test')).toBeVisible()
  await expect(page.getByText('coordinator@clashfree.test')).toBeVisible()
  await expect(page.getByText('lecturer@clashfree.test')).toBeVisible()
  await expect(page.getByText('student@clashfree.test')).toBeVisible()
})
