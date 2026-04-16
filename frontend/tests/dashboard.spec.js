/**
 * dashboard.spec.js — Manager Dashboard (Module 6) tests.
 * Runs with manager storageState.
 */

import { test, expect } from '@playwright/test'

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('renders the dashboard heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /dashboard/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows top stats row', async ({ page }) => {
    // Should show "clients medicated", "refusals", "alerts", "tasks" stats
    await expect(
      page.getByText(/medicated|compliance|refusal|alert|task/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows active alerts panel', async ({ page }) => {
    await expect(
      page.getByText(/alert|low stock|overdue/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows shift progress section', async ({ page }) => {
    await expect(
      page.getByText(/Morning|Afternoon/).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('monthly report generator is accessible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /report|generate|export/i })
        .or(page.getByText(/monthly report/i))
        .first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('dashboard auto-refresh badge or timer is present', async ({ page }) => {
    // LiveBadge or "refreshes every 60s" indicator
    await expect(
      page.getByText(/live|refresh|updated/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Manager-only role guard', () => {
  test('staff role cannot access /dashboard', async ({ browser }) => {
    // Use staff storage state
    const context = await browser.newContext({
      storageState: './tests/.auth/staff.json',
    })
    const page = await context.newPage()
    await page.goto('/dashboard')
    // Should be redirected (staff → /mar)
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 10_000 })
    await context.close()
  })
})
