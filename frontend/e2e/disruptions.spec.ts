import { expect, test } from '@playwright/test'

const password = 'ClashFree!dev'
const weekdayOffset: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
}

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login$/, { timeout: 20_000 })
}

async function expectHeading(page: import('@playwright/test').Page, name: string) {
  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 20_000 })
}

function dateForWeekday(weekday: string) {
  const offset = weekdayOffset[weekday] ?? 0
  const date = new Date(Date.UTC(2026, 8, 7 + offset))
  return date.toISOString().slice(0, 10)
}

test.describe.configure({ mode: 'serial' })

test('administrator can generate, publish, and see seed disruptions', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await signIn(page, 'admin@clashfree.test')
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await page.goto('/admin/generate-timetable')
  await expectHeading(page, 'Generate Timetable')
  await expect(page.getByRole('button', { name: 'Start Generation' })).toBeEnabled()
  await page.getByLabel('Time limit').click()
  await page.getByRole('option', { name: '10 seconds' }).click()
  await page.getByRole('button', { name: 'Start Generation' }).click()
  await expect(page).toHaveURL(/\/admin\/generation-results$/, { timeout: 90_000 })
  await expect(page.getByText(/feasible/i).first()).toBeVisible()
  await page.goto('/admin/publish-timetable')
  await expectHeading(page, 'Publish Timetable')
  await expect(page.getByRole('button', { name: 'Confirm publish' })).toBeEnabled()
  await page.getByRole('button', { name: 'Confirm publish' }).click()
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/timetable-versions$/)
  await page.goto('/admin/disruption-centre')
  await expectHeading(page, 'Disruption Centre')
  await expect(page.getByText('Electrical fault')).toBeVisible()
  await expect(page.getByText('Temporary absence')).toBeVisible()
  await expect(page.getByText('Scheduled maintenance')).toBeVisible()
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Repair Timetable' }),
  ).toHaveAttribute('href', '/admin/repair-timetable')
})

test('facilities can report a published room disruption and see affected classes', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await signIn(page, 'admin@clashfree.test')
  const published = await page.request.get('/api/timetables/published')
  expect(published.ok()).toBeTruthy()
  const body = (await published.json()) as {
    slots: Array<{ room_code: string; weekday: string; course_code: string }>
  }
  const slot = body.slots[0]
  expect(slot).toBeTruthy()
  await page.request.post('/api/auth/logout')

  await signIn(page, 'facilities@clashfree.test')
  await expect(page).toHaveURL(/\/facilities\/dashboard$/)
  await page.goto('/facilities/report-disruption')
  await expectHeading(page, 'Report Disruption')
  await page.getByRole('combobox', { name: 'Room' }).click()
  await page.getByRole('option', { name: slot.room_code, exact: true }).click()
  await page.getByLabel('Reason').fill('Playwright room outage')
  const day = dateForWeekday(slot.weekday)
  await page.getByLabel('Start date').fill(day)
  await page.getByLabel('End date').fill(day)
  await expect(page.getByRole('button', { name: 'Report Disruption' })).toBeEnabled()
  await page.getByRole('button', { name: 'Report Disruption' }).click()
  await expect(page.getByRole('link', { name: 'View affected classes' })).toBeVisible()
  await page.getByRole('link', { name: 'View affected classes' }).click()
  await expect(page).toHaveURL(/\/facilities\/affected-classes/)
  await expectHeading(page, 'Affected Classes')
  await expect(page.getByText(slot.course_code).first()).toBeVisible()
})

test('lecturer unavailability appears in the disruption centre with impact', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  await page.goto('/lecturer/report-unavailability')
  await expectHeading(page, 'Report Unavailability')
  const reason = `Playwright conference ${Date.now()}`
  await page.getByLabel('Start date').fill('2026-09-01')
  await page.getByLabel('End date').fill('2026-09-30')
  await page.getByLabel('Reason').fill(reason)
  await expect(page.getByRole('button', { name: 'Submit Report' })).toBeEnabled()
  await page.getByRole('button', { name: 'Submit Report' }).click()
  await expect(page.getByText(reason)).toBeVisible()
  await page.request.post('/api/auth/logout')

  await signIn(page, 'admin@clashfree.test')
  await page.goto('/admin/disruption-centre')
  const row = page.getByRole('row', { name: reason })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Analyze Impact' }).click()
  await expect(page.getByRole('heading', { name: /Impact ·/ })).toBeVisible()
  await expect(page.getByText('No published classes overlap this window.')).toHaveCount(0)
  await expect(
    page.getByText(/Monday|Tuesday|Wednesday|Thursday|Friday/).first(),
  ).toBeVisible()
})

test('lecturer cannot open disruption centre or POST a room disruption', async ({
  page,
}) => {
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  await page.goto('/admin/disruption-centre')
  await expect(page).toHaveURL(/\/forbidden$/)
  const response = await page.request.post('/api/disruptions', {
    data: {
      kind: 'room',
      room_id: 1,
      reason: 'blocked',
      starts_on: '2026-09-22',
      ends_on: '2026-09-23',
    },
  })
  expect(response.status()).toBe(403)
})
