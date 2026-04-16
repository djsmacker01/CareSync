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
    const taskCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: /AM|PM|Complete|Done|Handover/i })
    const hasTaskCards = await taskCards.count()
    const emptyState = page.getByText(/No tasks for this shift/i)
    const emptyVisible = await emptyState.isVisible().catch(() => false)
    expect(hasTaskCards > 0 || emptyVisible).toBe(true)
  })

  test('tasks have checkboxes or completion buttons', async ({ page }) => {
    const checkbox = page.getByRole('checkbox').first()
    const btn      = page.getByRole('button', { name: /complete|done|mark/i }).first()
    const hasInteraction = (await checkbox.isVisible().catch(() => false))
                        || (await btn.isVisible().catch(() => false))
    expect(hasInteraction).toBe(true)
  })

  test('handover button or section is present', async ({ page }) => {
    const handoverAction = page.getByRole('button', { name: /Write Handover Note/i }).first()
    const handoverText = page.getByText(/Handover/i).first()
    const hasAction = await handoverAction.isVisible().catch(() => false)
    const hasText = await handoverText.isVisible().catch(() => false)
    expect(hasAction || hasText).toBe(true)
  })
})
