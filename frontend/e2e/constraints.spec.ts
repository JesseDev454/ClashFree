import { expect, test } from '@playwright/test'

const password = 'ClashFree!dev'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe.configure({ mode: 'serial' })

test('administrator can toggle a soft constraint and save weights', async ({ page }) => {
  await signIn(page, 'admin@clashfree.test')
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await page.goto('/admin/scheduling-constraints')
  await expect(
    page.getByRole('heading', { name: 'Scheduling Constraints' }),
  ).toBeVisible()
  const idleToggle = page.getByRole('switch', { name: 'Minimize student idle gaps' })
  await expect(idleToggle).toHaveAttribute('aria-checked', 'true')
  await idleToggle.click()
  await expect(idleToggle).toHaveAttribute('aria-checked', 'false')
  await idleToggle.click()
  await expect(idleToggle).toHaveAttribute('aria-checked', 'true')

  await page.goto('/admin/constraint-weights')
  await expect(page.getByRole('heading', { name: 'Constraint Weights' })).toBeVisible()
  await page.getByRole('button', { name: 'Save Weights' }).click()
  await expect(page.getByRole('status')).toHaveText('Weights saved.')
})

test('lecturer can edit availability and cannot stay on admin constraints', async ({
  page,
}) => {
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  await page.goto('/lecturer/availability')
  await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible()
  const slot = page.getByRole('button', { name: /Monday 12-14/i })
  await expect(slot).toBeVisible()
  const preferredCard = page.locator('article').filter({ hasText: 'Preferred Slots' })
  const before = Number((await preferredCard.locator('p').nth(1).textContent()) ?? '0')
  const label = (await slot.getAttribute('aria-label')) ?? ''
  if (label.includes('unavailable')) {
    await slot.click()
  }
  let changed = false
  if (!(await slot.getAttribute('aria-label'))?.includes('preferred')) {
    await slot.click()
    changed = true
  }
  await expect(
    page.getByRole('button', { name: /Monday 12-14 preferred/i }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save Availability' }).click()
  await expect(page.getByRole('status')).toHaveText('Availability saved.')
  if (changed) {
    await expect(preferredCard.locator('p').nth(1)).not.toHaveText(String(before))
  }

  await page.getByRole('button', { name: /Monday 12-14 preferred/i }).click()
  await page.getByRole('button', { name: /Monday 12-14 unavailable/i }).click()
  await page.getByRole('button', { name: 'Save Availability' }).click()
  await expect(page.getByRole('status')).toHaveText('Availability saved.')

  await page.goto('/admin/scheduling-constraints')
  await expect(page).toHaveURL(/\/forbidden$/)
})

test('facilities manager can open the LT1 room grid', async ({ page }) => {
  await signIn(page, 'facilities@clashfree.test')
  await expect(page).toHaveURL(/\/facilities\/dashboard$/)
  await page.goto('/facilities/room-availability')
  await expect(page.getByRole('heading', { name: 'Room Availability' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /LT1/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Unavailable/i }).first()).toBeVisible()
})

test('lecturer constraint writes are rejected with 403', async ({ page }) => {
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  const response = await page.request.patch('/api/constraints/1', {
    data: { enabled: false },
  })
  expect(response.status()).toBe(403)
})
