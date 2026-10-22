import { test, expect } from '@playwright/test'
import { USERS, login, loginAndWait } from './fixtures.js'

const roles = {
  student: USERS.student,
  'club admin': USERS.roboticsAdmin,
  'website admin': USERS.webAdmin,
}

for (const [role, email] of Object.entries(roles)) {
  test(`${role} can log in`, async ({ page }) => {
    await loginAndWait(page, email)
    await expect(page).not.toHaveURL(/\/login/)
  })
}

test('a wrong password shows an error and stays on the login page', async ({ page }) => {
  await login(page, USERS.student, 'wrong-password')
  await expect(page.locator('p.error')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('opening /login while logged in alerts and redirects Home', async ({ page }) => {
  await loginAndWait(page, USERS.student)
  const dialog = page.waitForEvent('dialog')
  await page.goto('/login')
  expect((await dialog).message()).toMatch(/already logged in/i)
  await (await dialog).accept()
  await expect(page).toHaveURL('/')
})