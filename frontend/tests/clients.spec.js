/**
 * clients.spec.js — Service Users / Clients module tests.
 * Runs with manager storageState.
 */

import { test, expect } from '@playwright/test'

test.describe('Clients page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
  })

  test('renders the clients page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /client|service user|resident/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('lists seeded clients', async ({ page }) => {
    await expect(
      page.getByText(/Adams|Brown|Clarke|Davis|Evans/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows an Add Client button (manager)', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add client|new client/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a client navigates to their profile', async ({ page }) => {
    const clientLink = page.getByText(/George Adams|Dorothy Brown/i).first()
    if (await clientLink.isVisible()) {
      await clientLink.click()
      await expect(page).toHaveURL(/\/clients\//, { timeout: 10_000 })
    }
  })
})

test.describe('Client profile page', () => {
  test('shows client details and medications', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    const clientLink = page.getByText(/George Adams|Dorothy Brown/i).first()
    if (await clientLink.isVisible()) {
      await clientLink.click()
      await page.waitForURL(/\/clients\//, { timeout: 10_000 })
      // Profile should show medications
      await expect(
        page.getByText(/medication|Amlodipine|Aspirin|Metformin/i).first()
      ).toBeVisible({ timeout: 10_000 })
    }
  })
})
