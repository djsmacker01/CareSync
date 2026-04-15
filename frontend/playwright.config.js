import { defineConfig, devices } from '@playwright/test'

/**
 * Test credentials — override via environment variables or a .env.test file.
 * Defaults match the seed data in supabase/migrations/009_seed.sql.
 */
export default defineConfig({
  testDir:     './tests',
  fullyParallel: false,   // auth state files must exist before tests run
  forbidOnly:  !!process.env.CI,
  retries:     process.env.CI ? 2 : 0,
  workers:     process.env.CI ? 1 : 2,
  reporter:    [['html', { open: 'never' }], ['list']],
  globalSetup: './tests/global-setup.js',

  use: {
    baseURL:           process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace:             'on-first-retry',
    screenshot:        'only-on-failure',
    actionTimeout:     10_000,
    navigationTimeout: 15_000,
    // Tablet viewport — CareSync is designed for tablets
    viewport: { width: 1024, height: 768 },
  },

  projects: [
    // ── Unauthenticated tests (no storageState needed) ──
    {
      name: 'unauthenticated',
      testMatch: ['**/auth.spec.js', '**/protected-routes.spec.js'],
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Staff-role tests ──
    {
      name: 'staff',
      testMatch: ['**/mar.spec.js', '**/stock.spec.js', '**/tasks.spec.js',
                  '**/fire.spec.js', '**/visitors.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/.auth/staff.json',
      },
    },

    // ── Manager-role tests ──
    {
      name: 'manager',
      testMatch: ['**/dashboard.spec.js', '**/clients.spec.js', '**/staff-mgmt.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/.auth/manager.json',
      },
    },
  ],
})
