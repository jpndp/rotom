import { test, expect } from '@playwright/test'
import { PASSWORD, USERS, loginAndWait, seedIds } from './fixtures.js'

test.describe('student', () => {
  test('a guest is sent to login from Register and returned to the event', async ({ page }) => {
    const { workshopId } = seedIds()
    await page.goto(`/events/${workshopId}`)
    await page.getByRole('button', { name: 'Login to Register' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.getByLabel('Email').fill(USERS.student)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page).toHaveURL(`/events/${workshopId}`)
  })

  test('can register, see it in My registrations, and cancel', async ({ page }) => {
    const { workshopId } = seedIds()
    await loginAndWait(page, USERS.student)
    await page.goto(`/events/${workshopId}`)

    await page.getByRole('button', { name: 'Register', exact: true }).click()
    await expect(page.getByText('You are registered for this event.')).toBeVisible()

    await page.goto('/my-registrations')
    await expect(page.getByText('Robotics Workshop')).toBeVisible()

    await page.goto(`/events/${workshopId}`)
    await page.getByRole('button', { name: 'Cancel registration' }).click()
    await expect(page.getByText('Registration cancelled.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible()
  })
})
