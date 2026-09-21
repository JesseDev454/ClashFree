import { expect, test } from '@playwright/test'

const password = 'ClashFree!dev'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe.configure({ mode: 'serial' })

test('administrator can generate a draft and open it on the master timetable', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await signIn(page, 'admin@clashfree.test')
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await page.goto('/admin/generate-timetable')
  await expect(page.getByRole('heading', { name: 'Generate Timetable' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Generation' })).toBeEnabled()
  await page.getByLabel('Time limit').click()
  await page.getByRole('option', { name: '10 seconds' }).click()
  await page.getByRole('button', { name: 'Start Generation' }).click()
  await expect(page).toHaveURL(/\/admin\/generation-results$/, { timeout: 90_000 })
  await expect(page.getByText(/feasible/i).first()).toBeVisible()
  await page.goto('/admin/master-timetable')
  await expect(page.getByRole('heading', { name: 'Master Timetable' })).toBeVisible()
  await expect(page.getByText('SWE 401').first()).toBeVisible()
})

test('lecturer cannot stay on generate timetable and cannot POST generate', async ({
  page,
}) => {
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  await page.goto('/admin/generate-timetable')
  await expect(page).toHaveURL(/\/forbidden$/)
  const response = await page.request.post('/api/timetables/generate', {
    data: { time_limit_seconds: 5, alternative_count: 1 },
  })
  expect(response.status()).toBe(403)
})
