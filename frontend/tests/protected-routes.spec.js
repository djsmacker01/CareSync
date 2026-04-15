/**
 * protected-routes.spec.js — Unauthenticated access and role-based guards.
 * Runs without any saved auth state.
 */

import { test, expect } from '@playwright/test'

const PROTECTED_ROUTES = ['/mar', '/stock', '/tasks', '/fire', '/visitors']
const MANAGER_ONLY     = ['/dashboard', '/staff']

test.describe('Unauthenticated redirects', () => {
  for (const route of [...PROTECTED_ROUTES, ...MANAGER_ONLY]) {
    test(`${route} → redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    })
  }

  test('unknown route → redirects to /login', async ({ page }) => {
    await page.goto('/does-not-exist')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('/reset-password is public', async ({ page }) => {
    await page.goto('/reset-password')
    // Should NOT redirect to /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 })
  })
})
