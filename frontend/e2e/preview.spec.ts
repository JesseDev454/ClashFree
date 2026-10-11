import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const healthOk = {
  status: 'ok',
  service: 'clashfree-api',
  database: 'connected',
  probe: {
    id: 1,
    last_seen_at: '2026-09-18T15:00:00+00:00',
    source: 'health-endpoint',
  },
}

async function mockHealth(page: Page, body = healthOk, status = 200) {
  await page.route('**/health', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

async function mockAnonymousSession(page: Page) {
  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Not authenticated' }),
    })
  })
}

async function preparePage(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  })
  await page.evaluate(() => document.fonts.ready)
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
}

test.describe('preview navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnonymousSession(page)
    await mockHealth(page)
  })

  test('redirects the preview index to the dashboard and keeps selected state', async ({
    page,
  }) => {
    await page.goto('/preview')
    await expect(page).toHaveURL(/\/preview\/admin\/dashboard$/)
    await preparePage(page)
    await expect(page.getByRole('status').first()).toContainText('sample fixtures')
    await expect(page.getByTestId('backend-status')).toHaveText('API connected')
    await expect(
      page.locator('aside a[href="/preview/admin/dashboard"]'),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('opens the component gallery from the dashboard banner', async ({ page }) => {
    await page.goto('/preview/admin/dashboard')
    await page.getByRole('link', { name: 'Open component gallery' }).click()
    await expect(page).toHaveURL(/\/preview\/components$/)
    await expect(page.getByRole('heading', { name: 'Reusable components' })).toBeVisible()
  })

  test('explains that later screens belong to a future phase', async ({ page }) => {
    await page.goto('/preview/admin/dashboard')
    await page.locator('aside').getByRole('link', { name: 'Courses' }).click()
    await expect(page).toHaveURL(/\/preview\/unavailable\/admin-courses$/)
    await expect(page.getByText(/belongs to Phase 3/i)).toBeVisible()
  })

  test('handles unknown routes and refreshes', async ({ page }) => {
    await page.goto('/does-not-exist')
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await page.goto('/preview/admin/dashboard')
    await page.reload()
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible()
    await expect(page.getByTestId('backend-status')).toHaveText('API connected')
  })
})

test.describe('preview integrity and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnonymousSession(page)
    await mockHealth(page)
  })

  test('keeps generation inert and routes repair to the design-lab studio', async ({
    page,
  }) => {
    await page.goto('/preview/admin/dashboard')
    const generate = page.getByRole('button', { name: 'Generate Timetable' }).first()
    await expect(generate).toBeDisabled()
    await generate.click({ force: true })
    await expect(page.getByText(/workflows are unavailable/i)).toBeVisible()
    await page.getByRole('main').getByRole('link', { name: 'Repair Timetable' }).click()
    await expect(page).toHaveURL(/\/preview\/admin\/repair-studio$/)
    await expect(page.getByRole('heading', { name: 'Repair Studio' })).toBeVisible()
  })

  test('has no serious axe findings on preview routes', async ({ page }) => {
    await page.goto('/preview/admin/dashboard')
    await preparePage(page)
    await expectNoSeriousAxeViolations(page)
    await page.goto('/preview/components')
    await preparePage(page)
    await expectNoSeriousAxeViolations(page)
    await page.goto('/preview/admin/master-timetable')
    await preparePage(page)
    await expectNoSeriousAxeViolations(page)
    await page.goto('/preview/admin/repair-studio')
    await preparePage(page)
    await expectNoSeriousAxeViolations(page)
  })

  test('supports keyboard traversal of the gallery', async ({ page }) => {
    await page.goto('/preview/components')
    await page.locator('body').press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
  })

  test('restores focus after closing gallery dialogs', async ({ page }) => {
    await page.goto('/preview/components')

    const modalTrigger = page.getByRole('button', { name: 'Open details modal' })
    await modalTrigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(modalTrigger).toBeFocused()

    const confirmationTrigger = page.getByRole('button', { name: 'Open confirmation' })
    await confirmationTrigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(confirmationTrigger).toBeFocused()
  })
})

test.describe('responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnonymousSession(page)
    await mockHealth(page)
  })

  test('uses a desktop sidebar at 1600px and a drawer below 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await page.goto('/preview/admin/dashboard')
    await expect(page.getByLabel('Desktop navigation')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden()

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByLabel('Desktop navigation')).toBeHidden()
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused()
  })

  test('does not cause page-wide horizontal overflow', async ({ page }) => {
    for (const route of [
      '/preview/admin/dashboard',
      '/preview/admin/master-timetable',
      '/preview/admin/repair-studio',
    ]) {
      for (const width of [1600, 1280, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 })
        await page.goto(route)
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
        )
        expect(overflow, `overflow on ${route} at ${width}`).toBe(false)
      }
    }
  })
})

test.describe('design lab signature screens', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnonymousSession(page)
    await mockHealth(page)
  })

  test('drags a class to a free slot and keeps the change in the draft', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/preview/admin/master-timetable')
    await expect(page.getByText(/1 conflict needs/)).toBeVisible()
    const card = page.getByRole('button', { name: /^INS 405\. .*Tuesday 14:00/ })
    const wednesday = page.getByRole('group', { name: 'Wednesday', exact: true })
    const cardBox = await card.boundingBox()
    const columnBox = await wednesday.boundingBox()
    if (!cardBox || !columnBox) throw new Error('timetable not rendered')
    await page.mouse.move(cardBox.x + 20, cardBox.y + 10)
    await page.mouse.down()
    await page.mouse.move(cardBox.x + 40, cardBox.y + 30, { steps: 4 })
    await page.mouse.move(columnBox.x + 40, columnBox.y + 4 * 56 + 10, { steps: 8 })
    await page.mouse.up()
    const dialog = page.getByRole('dialog', { name: 'Propose moving INS 405?' })
    await expect(dialog.getByText('Wed 12:00–14:00 · Room A08')).toBeVisible()
    await dialog.getByRole('button', { name: 'Add to draft' }).click()
    await expect(page.getByText('1 unpublished change')).toBeVisible()
    await expect(page.getByText(/conflict needs/)).toHaveCount(0)
  })

  test('repairs the Room B12 closure and publishes a new version', async ({ page }) => {
    await page.goto('/preview/admin/repair-studio')
    await page.getByRole('button', { name: /Simulate B12 maintenance/ }).click()
    await page.getByRole('button', { name: 'Find repair options' }).click()
    await expect(page.getByRole('radio', { name: /Same times, new rooms/ })).toBeChecked()
    await page.getByRole('button', { name: 'Approve option' }).click()
    await page.getByRole('button', { name: 'Publish v4…' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByRole('heading', { name: 'Version 4 published' })).toBeVisible()
    await page.goto('/preview/admin/dashboard')
    await expect(page.getByText('Version 4 is live')).toBeVisible()
  })
})

test.describe('visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnonymousSession(page)
    await mockHealth(page)
  })

  test('dashboard at desktop, tablet and mobile widths', async ({ page }) => {
    await page.goto('/preview/admin/dashboard')
    await expect(page.getByTestId('backend-status')).toHaveText('API connected')
    await preparePage(page)

    await page.setViewportSize({ width: 1600, height: 1000 })
    await expect(page).toHaveScreenshot('admin-dashboard-1600.png', {
      animations: 'disabled',
      fullPage: true,
    })

    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page).toHaveScreenshot('admin-dashboard-768.png', {
      animations: 'disabled',
      fullPage: true,
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page).toHaveScreenshot('admin-dashboard-390.png', {
      animations: 'disabled',
      fullPage: true,
    })
  })

  test('master timetable and repair studio at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/preview/admin/master-timetable')
    await expect(page.getByTestId('backend-status')).toHaveText('API connected')
    await preparePage(page)
    await expect(page).toHaveScreenshot('master-timetable-1440.png', {
      animations: 'disabled',
      fullPage: true,
    })
    await page.goto('/preview/admin/repair-studio')
    await expect(page.getByTestId('backend-status')).toHaveText('API connected')
    await preparePage(page)
    await expect(page).toHaveScreenshot('repair-studio-empty-1440.png', {
      animations: 'disabled',
      fullPage: true,
    })
  })

  test('component gallery at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await page.goto('/preview/components')
    await preparePage(page)
    await expect(page).toHaveScreenshot('component-gallery-1600.png', {
      animations: 'disabled',
      fullPage: true,
    })
  })

  test('login and forgot-password screens at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await page.goto('/auth/login')
    await preparePage(page)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page).toHaveScreenshot('auth-login-1600.png', {
      animations: 'disabled',
      fullPage: true,
    })

    await page.goto('/auth/forgot-password')
    await preparePage(page)
    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible()
    await expect(page).toHaveScreenshot('auth-forgot-password-1600.png', {
      animations: 'disabled',
      fullPage: true,
    })
  })
})

test.describe('backend health', () => {
  test('shows API unreachable when the health request fails', async ({ page }) => {
    await mockAnonymousSession(page)
    await page.route('**/health', (route) => route.abort())
    await page.goto('/preview/admin/dashboard')
    await expect(page.getByTestId('backend-status')).toHaveText('API unreachable')
  })
})
