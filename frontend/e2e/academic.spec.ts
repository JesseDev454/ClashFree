import { expect, test } from '@playwright/test'

const password = 'ClashFree!dev'

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe.configure({ mode: 'serial' })

test('administrator can create, edit and delete a course', async ({ page }) => {
  const code = `TST ${Date.now().toString().slice(-6)}`
  await signIn(page, 'admin@clashfree.test')
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await page.goto('/admin/courses')
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()
  await expect(page.getByText('SWE 401')).toBeVisible()

  await page.getByRole('button', { name: '+ Add Course' }).click()
  await page.getByLabel('Code').fill(code)
  await page.getByLabel('Title').fill('Playwright Course')
  await page.getByRole('button', { name: 'Create course' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('row', { name: new RegExp(code) })).toBeVisible()

  await page
    .getByRole('row', { name: new RegExp(code) })
    .getByRole('button', { name: 'Edit' })
    .click()
  await page.getByLabel('Title').fill('Playwright Course Updated')
  await page.getByRole('button', { name: 'Save course' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Playwright Course Updated')).toBeVisible()

  await page
    .getByRole('row', { name: new RegExp(code) })
    .getByRole('button', { name: 'Delete' })
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('row', { name: new RegExp(code) })).toHaveCount(0)
})

test('lecturer cannot stay on administrator courses', async ({ page }) => {
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/forbidden$/)
})

test('lecturer course writes are rejected with 403', async ({ page }) => {
  await signIn(page, 'lecturer@clashfree.test')
  await expect(page).toHaveURL(/\/lecturer\/dashboard$/)
  const response = await page.request.post('/api/courses', {
    data: {
      code: 'LEC 001',
      title: 'Forbidden',
      department_id: 1,
      level: 100,
      units: 1,
      expected_size: 10,
      room_type: 'lab',
    },
  })
  expect(response.status()).toBe(403)
})
