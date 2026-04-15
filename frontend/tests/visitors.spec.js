/**
 * visitors.spec.js — Visitor Log (Module 5) tests.
 * Runs with staff storageState.
 */

import { test, expect } from '@playwright/test'

test.describe('Visitors page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/visitors')
    await page.waitForLoadState('networkidle')
  })

  test('renders the visitor log heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /visitor/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows a Sign In button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /sign in/i })
        .or(page.getByRole('button', { name: /add visitor/i }))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('sign-in modal has required fields', async ({ page }) => {
    const signInBtn = page.getByRole('button', { name: /sign in/i })
      .or(page.getByRole('button', { name: /add visitor/i }))
    await signInBtn.first().click()

    await expect(
      page.getByPlaceholder(/visitor name|full name/i)
        .or(page.getByLabel(/name/i))
    ).toBeVisible({ timeout: 8_000 })

    await expect(
      page.getByRole('combobox')          // "Who are they visiting" dropdown
        .or(page.getByLabel(/visiting/i))
    ).toBeVisible({ timeout: 8_000 })
  })

  test('shows active visitors section', async ({ page }) => {
    await expect(
      page.getByText(/currently (signed in|visiting)|active visitor/i)
        .or(page.getByRole('heading', { name: /active/i }))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows visitor history section', async ({ page }) => {
    await expect(
      page.getByText(/history|all visitors|log/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })
})
