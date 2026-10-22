import { test, expect } from '@playwright/test'
import { USERS, loginAndWait, seedIds } from './fixtures.js'

test.describe('club admin management', () => {
  test('sees who registered for an event', async ({ page }) => {
    const { roboticsId, workshopId } = seedIds()
    await loginAndWait(page, USERS.roboticsAdmin)
    await page.goto(`/admin/clubs/${roboticsId}/events/${workshopId}/registrants`)
    await expect(page.getByText('E2E Student Two')).toBeVisible()
    await expect(page.getByText('e2e.student2@demo.edu')).toBeVisible()
  })

  test('can mark a registrant present and absent', async ({ page }) => {
    const { roboticsId, workshopId } = seedIds()
    await loginAndWait(page, USERS.roboticsAdmin)
    await page.goto(`/admin/clubs/${roboticsId}/events/${workshopId}/attendance`)
    const row = page.locator('.attendance-row', { hasText: 'E2E Student Two' })
    await row.getByRole('button', { name: 'Mark present' }).click()
    await expect(row.getByRole('button', { name: 'Mark as absent' })).toBeVisible()
    await row.getByRole('button', { name: 'Mark as absent' }).click()
    await expect(row.getByRole('button', { name: 'Mark present' })).toBeVisible()
  })

  test('can post, edit and delete a club announcement', async ({ page }) => {
    const { roboticsId } = seedIds()
    const title = `E2E Notice ${Date.now()}`
    await loginAndWait(page, USERS.roboticsAdmin)
    await page.goto(`/admin/clubs/${roboticsId}/announcements`)

    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Content').fill('Posted by the e2e suite')
    await page.getByRole('button', { name: 'Post', exact: true }).click()
    const row = page.locator('.list-item', { hasText: title })
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: 'Edit' }).click()
    const editing = page.locator('.list-item').filter({ has: page.getByRole('button', { name: 'Save' }) })
    await editing.getByRole('textbox').first().fill(`${title} edited`)
    await editing.getByRole('button', { name: 'Save' }).click()
    const edited = page.locator('.list-item', { hasText: `${title} edited` })
    await expect(edited).toBeVisible()

    page.once('dialog', (d) => d.accept())
    await edited.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(`${title} edited`)).toHaveCount(0)
  })

  test('cannot post an announcement for another club', async ({ page }) => {
    const { debateId } = seedIds()
    await loginAndWait(page, USERS.roboticsAdmin)
    await page.goto(`/admin/clubs/${debateId}/announcements`)
    await page.getByLabel('Title').fill('Should not be posted')
    await page.getByLabel('Content').fill('Wrong club')
    await page.getByRole('button', { name: 'Post', exact: true }).click()
    await expect(page.locator('p.error')).toBeVisible()
    await expect(page.getByText('Should not be posted')).toHaveCount(0)
  })
})
