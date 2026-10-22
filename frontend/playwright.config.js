import { defineConfig, devices } from '@playwright/test'

const testDb = process.env.E2E_MONGODB_URI
if (!testDb) {
  throw new Error('Set E2E_MONGODB_URI to a throwaway database (e.g. .../rotom_test) first')
}

const dbName = testDb.replace(/^mongodb(\+srv)?:\/\/[^/]+\/?/, '').split('?')[0]
if (!dbName.endsWith('_test')) {
  throw new Error(`E2E_MONGODB_URI must point at a database ending in _test (got "${dbName}")`)
}

const API_PORT = 5001
const WEB_PORT = 5174

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  globalSetup: './e2e/global-setup.js',
  use: { baseURL: `http://localhost:${WEB_PORT}` },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: [
    {
      cwd: '../backend',
      command: 'npm run dev',
      port: API_PORT,
      reuseExistingServer: false,
      env: {
        PORT: String(API_PORT),
        MONGODB_URI: testDb,
        FRONTEND_URL: `http://localhost:${WEB_PORT}`,
        NODE_ENV: 'test', // skips the auth and AI rate limiters for the e2e run only
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: false,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api` },
    },
  ],
})