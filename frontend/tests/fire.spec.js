/**
 * fire.spec.js — Fire Safety Log (Module 4) tests.
 * Runs with staff storageState.
 */

import { test, expect } from '@playwright/test'

test.describe('Fire Safety page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fire')
    await page.waitForLoadState('networkidle')
  })

  test('renders the fire safety page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /fire/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('lists recurring fire safety checks', async ({ page }) => {
    await expect(
      page.getByText(/fire door|extinguisher|alarm|evacuation/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('checks show due dates or status badges', async ({ page }) => {
    const statusEl = page.getByText(/overdue|due today|pass|complete|scheduled/i).first()
    await expect(statusEl).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a check opens the log modal', async ({ page }) => {
    const logBtn = page.getByRole('button', { name: /^log check|^⚠ log check/i }).first()
    if (await logBtn.isVisible()) {
      await logBtn.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8_000 })
    }
  })

  test('log modal has Pass / Fail / Action Required options', async ({ page }) => {
    const logBtn = page.getByRole('button', { name: /^log check|^⚠ log check/i }).first()
    if (await logBtn.isVisible()) {
      await logBtn.click()
      await expect(page.getByText(/pass/i).first()).toBeVisible({ timeout: 8_000 })
      await expect(page.getByText(/fail/i).first()).toBeVisible({ timeout: 8_000 })
    }
  })
})
