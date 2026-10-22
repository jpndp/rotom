import { test, expect } from '@playwright/test'

test.describe('guest', () => {
  test('list view shows the upcoming events and none in the past tab', async ({ page }) => {
    await page.goto('/events')
    await expect(page.getByRole('link', { name: /Robotics Workshop/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Robotics Showcase/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Debate Night/ })).toBeVisible()
    await page.getByRole('button', { name: 'Past', exact: true }).click()
    await expect(page.getByText('No events found.')).toBeVisible()
  })

  test('an event opens its detail page', async ({ page }) => {
    await page.goto('/events')
    await page.getByRole('link', { name: /Debate Night/ }).click()
    await expect(page).toHaveURL(/\/events\/[a-f0-9]{24}$/)
  })

  test('month view marks weekends as blocked (red) days', async ({ page }) => {
    await page.goto('/events')
    await page.getByRole('button', { name: 'Month', exact: true }).click()
    await expect(page.getByText('Red dates are weekends, holidays or midsem periods.')).toBeVisible()
    // every month has at least 8 weekend days
    expect(await page.locator('.event-calendar-day.blocked').count()).toBeGreaterThanOrEqual(8)
  })

  test('schedule view groups upcoming events by day', async ({ page }) => {
    await page.goto('/events')
    await page.getByRole('button', { name: 'Schedule', exact: true }).click()
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Robotics Workshop' })).toBeVisible()
  })
})
