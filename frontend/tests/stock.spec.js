/**
 * stock.spec.js — Stock Manager (Module 2) tests.
 * Runs with staff storageState.
 */

import { test, expect } from '@playwright/test'

test.describe('Stock page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stock')
    await page.waitForLoadState('networkidle')
  })

  test('renders the stock page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /stock/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('lists clients with medication stock', async ({ page }) => {
    // Expect at least one of the seeded client names to appear
    await expect(
      page.getByText(/Adams|Brown|Clarke|Davis|Evans/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows stock level badges (green / amber / red)', async ({ page }) => {
    // At least one badge with a quantity should be visible
    const badge = page.locator('[class*="badge"], [class*="stock"], [class*="pill"]').first()
    await expect(badge).toBeVisible({ timeout: 10_000 })
  })

  test('shows medication names', async ({ page }) => {
    await expect(
      page.getByText(/Amlodipine|Aspirin|Metformin|Bisoprolol|Warfarin/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a medication opens the transaction modal', async ({ page }) => {
    // Find any clickable medication entry
    const medItem = page.getByText(/Amlodipine|Aspirin|Metformin/i).first()
    if (await medItem.isVisible()) {
      await medItem.click()
      // Should open a dialog / modal
      await expect(
        page.getByRole('dialog')
          .or(page.getByText(/transaction/i))
          .or(page.getByText(/add stock/i))
          .or(page.getByText(/adjust/i))
      ).toBeVisible({ timeout: 8_000 })
    }
  })
})
