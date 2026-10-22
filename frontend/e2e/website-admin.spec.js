import { test, expect } from '@playwright/test'
import { USERS, createEventForTest, loginAndWait, seedIds } from './fixtures.js'

test.describe('website admin', () => {
  test('can filter events by club and remove one from the moderation page', async ({ page, request }) => {
    const { debateId } = seedIds()
    const title = `E2E moderation event ${Date.now()}`
    await createEventForTest(request, USERS.webAdmin, debateId, title)
    await loginAndWait(page, USERS.webAdmin)
    await page.goto('/admin/moderation')
    await expect(page.getByRole('heading', { name: 'Moderate Events' })).toBeVisible()

    await page.getByRole('combobox').selectOption({ label: 'Debate Society' })
    await expect(page.getByText(title)).toBeVisible()
    await expect(page.getByText('Robotics Workshop')).toHaveCount(0)

    page.once('dialog', (d) => d.accept())
    await page.locator('.list-item', { hasText: title }).getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText(title)).toHaveCount(0)
    await expect(page.getByText('Debate Night')).toBeVisible()
  })

  test('can post a worldwide announcement', async ({ page }) => {
    const { debateId } = seedIds()
    const title = `E2E Worldwide ${Date.now()}`
    await loginAndWait(page, USERS.webAdmin)
    await page.goto(`/admin/clubs/${debateId}/announcements`)

    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Content').fill('Platform-wide e2e notice')
    await page.getByLabel('Visibility').selectOption('worldwide')
    await page.getByRole('button', { name: 'Post worldwide' }).click()

    const row = page.locator('.list-item', { hasText: title })
    await expect(row).toBeVisible()
    await expect(row.locator('.badge', { hasText: 'Worldwide' })).toBeVisible()

    page.once('dialog', (d) => d.accept())
    await row.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(title)).toHaveCount(0)
  })
})
