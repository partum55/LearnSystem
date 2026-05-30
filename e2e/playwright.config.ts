import { defineConfig, devices } from '@playwright/test';

/**
 * Env-driven Playwright config for the production/staging role-access walkthrough.
 *
 * Required env:
 *   E2E_BASE_URL            e.g. https://learnsystem.app  (defaults to production)
 * Credentials (NEVER hard-code — supply at run time; tests skip cleanly if absent):
 *   E2E_ADMIN_EMAIL   / E2E_ADMIN_PASSWORD
 *   E2E_TEACHER_EMAIL / E2E_TEACHER_PASSWORD
 *   E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD
 * Optional course-id fixtures used by the deep-link / restricted-access checks:
 *   E2E_STUDENT_ENROLLED_COURSE_ID   a PUBLISHED course the student IS enrolled in
 *   E2E_STUDENT_FORBIDDEN_COURSE_ID  a course the student is NOT enrolled in (expect restricted)
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://learnsystem.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Fresh, isolated context per test — required for auth-sensitive role switching.
    storageState: undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
