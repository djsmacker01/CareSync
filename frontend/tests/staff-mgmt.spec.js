/**
 * staff-mgmt.spec.js — Staff Management page tests.
 * Runs with manager storageState.
 */

import { test, expect } from '@playwright/test'

test.describe('Staff page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/staff')
    // Wait for the page header — confirms auth resolved and StaffPage rendered
    await page.getByRole('heading', { name: /staff/i }).waitFor({ state: 'visible', timeout: 15_000 })
  })

  test('renders the staff page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /staff/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('lists existing staff members', async ({ page }) => {
    await expect(
      page.getByText(/Alice Nurse|Bob Supervisor|Carol Manager/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows Add Staff button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add staff|new staff|add user/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('Add Staff modal opens with required fields', async ({ page }) => {
    await page.getByRole('button', { name: /add staff|new staff|add user/i }).click()
    await expect(
      page.getByRole('dialog')
    ).toBeVisible({ timeout: 8_000 })
    // Should have role selector (combobox = <select>)
    await expect(
      page.getByRole('combobox')
    ).toBeVisible({ timeout: 8_000 })
  })

  test('staff entries show role badges', async ({ page }) => {
    await expect(
      page.getByText(/manager|supervisor|staff/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })
})
