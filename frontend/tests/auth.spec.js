/**
 * auth.spec.js — Login page UI and authentication flows.
 * Runs without any saved auth state (unauthenticated project).
 */

import { test, expect } from '@playwright/test'

const STAFF_EMAIL   = process.env.TEST_STAFF_EMAIL    || 'staff@caresync.test'
const STAFF_PASS    = process.env.TEST_STAFF_PASSWORD || 'TestPass123!'
const MANAGER_EMAIL = process.env.TEST_MANAGER_EMAIL    || 'manager@caresync.test'
const MANAGER_PASS  = process.env.TEST_MANAGER_PASSWORD || 'TestPass123!'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders the CareSync branding', async ({ page }) => {
    await expect(page.getByText('CareSync').first()).toBeVisible()
    await expect(page.getByText('Care Home Management')).toBeVisible()
  })

  test('shows email + PIN mode toggle', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Email login' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PIN login' })).toBeVisible()
  })

  test('email login form has correct fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Email login' }).click()
    await expect(page.getByPlaceholder('you@caresync.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('PIN login form shows keypad', async ({ page }) => {
    await page.getByRole('button', { name: 'PIN login' }).click()
    await expect(page.getByPlaceholder('you@caresync.com')).toBeVisible()
    // Keypad digit buttons
    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      await expect(page.getByRole('button', { name: digit, exact: true })).toBeVisible()
    }
  })

  test('shows error on wrong password', async ({ page }) => {
    await page.getByPlaceholder('you@caresync.com').fill(STAFF_EMAIL)
    await page.getByPlaceholder('••••••••').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // Error banner should appear
    await expect(page.locator('[class*="bg-red"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('shows error on non-existent email', async ({ page }) => {
    await page.getByPlaceholder('you@caresync.com').fill('nobody@caresync.test')
    await page.getByPlaceholder('••••••••').fill('AnyPass123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('[class*="bg-red"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('forgot password flow renders correctly', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await expect(page.getByText('Back to login')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible()
  })

  test('back to login from forgot password', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await page.getByRole('button', { name: /back to login/i }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })
})

test.describe('Successful login', () => {
  test('staff logs in and reaches /mar', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Email login' }).click()
    await page.getByPlaceholder('you@caresync.com').fill(STAFF_EMAIL)
    await page.getByPlaceholder('••••••••').fill(STAFF_PASS)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/mar', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/mar/)
  })

  test('manager logs in and reaches /dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Email login' }).click()
    await page.getByPlaceholder('you@caresync.com').fill(MANAGER_EMAIL)
    await page.getByPlaceholder('••••••••').fill(MANAGER_PASS)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('already-logged-in user visiting /login is redirected', async ({ page }) => {
    // Log in first
    await page.goto('/login')
    await page.getByPlaceholder('you@caresync.com').fill(STAFF_EMAIL)
    await page.getByPlaceholder('••••••••').fill(STAFF_PASS)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/mar', { timeout: 15_000 })

    // Revisit login — should be redirected away
    await page.goto('/login')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
