/**
 * global-setup.js
 *
 * Runs once before all Playwright tests. Logs in as each test role and saves
 * the browser storage state so individual tests can skip the login flow.
 *
 * Required environment variables (fallback to seed defaults):
 *   TEST_STAFF_EMAIL      default: staff@caresync.test
 *   TEST_STAFF_PASSWORD   default: TestPass123!
 *   TEST_MANAGER_EMAIL    default: manager@caresync.test
 *   TEST_MANAGER_PASSWORD default: TestPass123!
 */

import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

const USERS = [
  {
    email:    process.env.TEST_STAFF_EMAIL    || 'staff@caresync.test',
    password: process.env.TEST_STAFF_PASSWORD || 'TestPass123!',
    file:     path.join(__dirname, '.auth', 'staff.json'),
  },
  {
    email:    process.env.TEST_MANAGER_EMAIL    || 'manager@caresync.test',
    password: process.env.TEST_MANAGER_PASSWORD || 'TestPass123!',
    file:     path.join(__dirname, '.auth', 'manager.json'),
  },
]

export default async function globalSetup() {
  const browser = await chromium.launch()

  for (const user of USERS) {
    const context = await browser.newContext()
    const page    = await context.newPage()

    await page.goto(`${BASE_URL}/login`)

    // Fill email + password form
    await page.getByRole('button', { name: 'Email login' }).click()
    await page.getByPlaceholder('you@caresync.com').fill(user.email)
    await page.getByPlaceholder('••••••••').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Wait until redirected away from /login (auth + hydration complete)
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15_000 })

    await context.storageState({ path: user.file })
    await context.close()

    console.log(`[global-setup] Saved auth state for ${user.email} → ${user.file}`)
  }

  await browser.close()
}
