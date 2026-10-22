import { test, expect } from '@playwright/test'
import { USERS, loginAndWait, seedIds } from './fixtures.js'

test.describe('club admin', () => {
  test('sees the management controls for their own club', async ({ page }) => {
    await loginAndWait(page, USERS.roboticsAdmin)
    await page.goto(`/admin/clubs/${seedIds().roboticsId}`)
    await expect(page.getByRole('heading', { name: 'Robotics Club' })).toBeVisible()
    for (const name of ['New Event', 'Edit Club', 'Org Chart', 'Announcements']) {
      await expect(page.getByRole('link', { name })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Event Ideas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Chat with AI' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Club' })).toHaveCount(0)
  })

  test('can remove one of their own events', async ({ page }) => {
    await loginAndWait(page, USERS.roboticsAdmin)
    await page.goto(`/admin/clubs/${seedIds().roboticsId}`)
    const row = page.locator('.list-item', { hasText: 'Robotics Cleanup Day' })
    page.once('dialog', (d) => d.accept())
    await row.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(page.getByText('Robotics Cleanup Day')).toHaveCount(0)
    await expect(page.getByText('Robotics Workshop')).toBeVisible()
  })

  test('cannot remove an event of another club', async ({ page }) => {
    await loginAndWait(page, USERS.roboticsAdmin)
    await page.goto(`/admin/clubs/${seedIds().debateId}`)
    const row = page.locator('.list-item', { hasText: 'Debate Night' })
    page.once('dialog', (d) => d.accept())
    await row.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(page.locator('p.error')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Debate Night')).toBeVisible()
  })
})

test.describe('website admin', () => {
  test('sees Remove Club on any club page', async ({ page }) => {
    await loginAndWait(page, USERS.webAdmin)
    await page.goto(`/admin/clubs/${seedIds().debateId}`)
    await expect(page.getByRole('button', { name: 'Remove Club' })).toBeVisible()
  })
})
