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

test('administrator can repair one disruption and publish it', async ({ page }) => {
  test.setTimeout(180_000)
  await signIn(page, 'admin@clashfree.test')
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Repair Timetable' }),
  ).toHaveAttribute('href', '/admin/repair-timetable')
  await page.goto('/admin/generate-timetable')
  await expectHeading(page, 'Generate Timetable')
  await page.getByLabel('Time limit').click()
  await page.getByRole('option', { name: '10 seconds' }).click()
  await page.getByRole('button', { name: 'Start Generation' }).click()
  await expect(page).toHaveURL(/\/admin\/generation-results$/, { timeout: 90_000 })
  await expect(page.getByText(/feasible/i).first()).toBeVisible()
  await page.goto('/admin/publish-timetable')
  await expectHeading(page, 'Publish Timetable')
  await page.getByRole('button', { name: 'Confirm publish' }).click()
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/timetable-versions$/)

  const published = await page.request.get('/api/timetables/published')
  expect(published.ok()).toBeTruthy()
  const body = (await published.json()) as {
    slots: Array<{
      room_id: number
      weekday: string
      start_period: string
      end_period: string
    }>
  }
  const slot = body.slots[0]
  const reason = `Playwright repair ${Date.now()}`
  const created = await page.request.post('/api/disruptions', {
    data: {
      kind: 'room',
      room_id: slot.room_id,
      reason,
      starts_on: dateForWeekday(slot.weekday),
      ends_on: dateForWeekday(slot.weekday),
      start_period: slot.start_period,
      end_period: slot.end_period,
    },
  })
  expect(created.ok()).toBeTruthy()
  const disruption = (await created.json()) as { id: number }

  await page.goto(`/admin/repair-timetable?disruptionId=${disruption.id}`)
  await expectHeading(page, 'Repair Timetable')
  await expect(page.getByRole('button', { name: 'Start Repair' })).toBeEnabled()
  await page.getByRole('button', { name: 'Start Repair' }).click()
  await expect(page).toHaveURL(/\/admin\/repair-comparison\?runId=/, { timeout: 90_000 })
  await expect(page.getByText(/feasible/i).first()).toBeVisible()
  const useOption = page.getByRole('button', { name: 'Use this option' })
  if ((await useOption.count()) > 0) {
    await useOption.first().click()
  }
  await page.getByRole('main').getByRole('link', { name: 'Publish', exact: true }).click()
  await expectHeading(page, 'Publish Timetable')
  await page.getByRole('button', { name: 'Confirm publish' }).click()
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/timetable-versions$/)

  await page.goto('/admin/disruption-centre')
  await expectHeading(page, 'Disruption Centre')
  await expect(page.getByText(reason)).toBeVisible()
  await expect(page.getByText('Repaired').first()).toBeVisible()
})

test('lecturer cannot open repair or call the repair API', async ({ page }) => {
  test.setTimeout(45_000)
  await signIn(page, 'lecturer@clashfree.test')
  await page.goto('/admin/repair-timetable')
  await expect(page).toHaveURL(/\/forbidden/)
  const denied = await page.request.post('/api/timetables/repair', {
    data: { disruption_id: 1, time_limit_seconds: 10, alternative_count: 1 },
  })
  expect(denied.status()).toBe(403)
})
