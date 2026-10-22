import { readFileSync } from 'node:fs'

export const PASSWORD = 'E2e@pass1234' // keep in sync with backend/scripts/seedE2E.js

export const USERS = {
  student: 'e2e.student@demo.edu',
  student2: 'e2e.student2@demo.edu',
  roboticsAdmin: 'e2e.robotics@demo.edu',
  debateAdmin: 'e2e.debate@demo.edu',
  webAdmin: 'e2e.webadmin@demo.edu',
}

// ids written by backend/scripts/seedE2E.js; read lazily so --list works before the first seed
export const seedIds = () => JSON.parse(readFileSync(new URL('./.seed.json', import.meta.url), 'utf8'))

export async function login(page, email, password = PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
}

export async function loginAndWait(page, email) {
  await login(page, email)
  await page.waitForURL((url) => url.pathname !== '/login')
}
