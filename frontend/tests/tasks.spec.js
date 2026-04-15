/**
 * tasks.spec.js — Task Board (Module 3) tests.
 * Runs with staff storageState.
 */

import { test, expect } from '@playwright/test'

test.describe('Tasks page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
  })

  test('renders the tasks page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /task/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows AM and PM shift sections', async ({ page }) => {
    await expect(page.getByText(/AM/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/PM/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('seeded tasks are listed', async ({ page }) => {
    await expect(
      page.getByText(/medication round|personal care|breakfast|dinner|stock check/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('tasks have checkboxes or completion buttons', async ({ page }) => {
    const checkbox = page.getByRole('checkbox').first()
    const btn      = page.getByRole('button', { name: /complete|done|mark/i }).first()
    const hasInteraction = (await checkbox.isVisible().catch(() => false))
                        || (await btn.isVisible().catch(() => false))
    expect(hasInteraction).toBe(true)
  })

  test('handover button or section is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /handover/i })
        .or(page.getByText(/handover/i))
    ).toBeVisible({ timeout: 10_000 })
  })
})
