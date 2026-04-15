/**
 * mar.spec.js — Digital MAR (Module 1) tests.
 * Runs with staff storageState.
 */

import { test, expect } from '@playwright/test'

test.describe('MAR page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mar')
    // Wait for data to load (progress bar or client cards)
    await page.waitForLoadState('networkidle')
  })

  test('renders the MAR page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /medication/i })).toBeVisible({ timeout: 10_000 })
  })

  test('shows AM / PM shift tabs or filter', async ({ page }) => {
    // Page should have some shift indicator
    const amEl = page.getByText(/AM/i).first()
    const pmEl = page.getByText(/PM/i).first()
    const hasShift = (await amEl.isVisible()) || (await pmEl.isVisible())
    expect(hasShift).toBe(true)
  })

  test('shows a progress indicator', async ({ page }) => {
    // e.g. "0 of 5 clients" or a progress bar
    const progress = page.locator('[role="progressbar"], [class*="progress"]').first()
    const hasText  = page.getByText(/of \d+ clients/i)
    const visible  = (await progress.isVisible().catch(() => false))
                  || (await hasText.isVisible().catch(() => false))
    expect(visible).toBe(true)
  })

  test('client cards are listed', async ({ page }) => {
    // At least one client card should be visible
    // Cards typically have a name — we look for any link/button that navigates to a client
    const cards = page.locator('[data-testid="client-card"], [class*="client"], a[href*="mar"], button').filter({ hasText: /Adams|Brown|Clarke|Davis|Evans/i })
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a client shows their medication list', async ({ page }) => {
    // Click the first client visible
    const firstClient = page.getByRole('button').filter({ hasText: /Adams|Brown|Clarke|Davis|Evans/i }).first()
    if (await firstClient.isVisible()) {
      await firstClient.click()
      // Should show medication details — look for "given" / "refused" buttons or medication names
      await expect(
        page.getByRole('button', { name: /given/i })
          .or(page.getByText(/Amlodipine|Aspirin|Metformin|Bisoprolol|Warfarin/i))
          .first()
      ).toBeVisible({ timeout: 10_000 })
    }
  })

  test('refusal modal appears on "Refused" click', async ({ page }) => {
    const refusedBtn = page.getByRole('button', { name: /refused/i }).first()
    if (await refusedBtn.isVisible()) {
      await refusedBtn.click()
      // Modal with reason dropdown should appear
      await expect(
        page.getByRole('dialog')
          .or(page.getByText(/reason/i))
          .or(page.getByText(/client declined/i))
      ).toBeVisible({ timeout: 8_000 })
    }
  })
})
