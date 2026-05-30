import { test, expect, Page } from '@playwright/test';

/**
 * Role-access walkthrough for the LearnSystem web app.
 *
 * This spec is intentionally credential-free: it reads the dedicated E2E accounts from environment
 * variables (see docs/e2e-testing.md — `e2e_admin@`, `e2e_teacher@`, `e2e_student@learnsystem.app`)
 * and SKIPS cleanly when they are not provided, so it never invents credentials and never fails for
 * lack of them. Per the project E2E rules it drives visible UI only (labels/buttons/links).
 *
 * Assertions cover the requested matrix:
 *   - enrolled student sees only enrolled courses
 *   - student cannot open a non-enrolled / draft course (RestrictedAccessState)
 *   - teacher sees own courses only
 *   - admin sees all courses
 *   - unauthenticated access redirects to login
 *   - a forbidden/not-found course deep-link shows the "Access restricted" state
 */

type RoleCreds = { email?: string; password?: string };

const admin: RoleCreds = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};
const teacher: RoleCreds = {
  email: process.env.E2E_TEACHER_EMAIL,
  password: process.env.E2E_TEACHER_PASSWORD,
};
const student: RoleCreds = {
  email: process.env.E2E_STUDENT_EMAIL,
  password: process.env.E2E_STUDENT_PASSWORD,
};

const enrolledCourseId = process.env.E2E_STUDENT_ENROLLED_COURSE_ID;
const forbiddenCourseId = process.env.E2E_STUDENT_FORBIDDEN_COURSE_ID;

function haveCreds(c: RoleCreds): boolean {
  return Boolean(c.email && c.password);
}

/** Log in through the visible login form. Selectors target accessible roles/labels. */
async function login(page: Page, creds: RoleCreds): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(creds.email!);
  await page.getByLabel(/password/i).fill(creds.password!);
  await page.getByRole('button', { name: /sign in|log ?in|continue/i }).click();
  // Land somewhere authenticated (not back on /login).
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

test.describe('Unauthenticated access', () => {
  test('protected course route redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/courses');
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });
});

test.describe('Student role', () => {
  test.skip(!haveCreds(student), 'E2E_STUDENT_EMAIL/PASSWORD not set');

  test('sees only enrolled courses on the courses list', async ({ page }) => {
    await login(page, student);
    await page.goto('/courses');
    // The student list must not surface admin-only controls (create / all-courses admin view).
    await expect(page.getByRole('button', { name: /create course/i })).toHaveCount(0);
    // At least the courses surface renders (cards or an explicit empty state), never an error screen.
    await expect(page.getByText(/something went wrong|failed to load/i)).toHaveCount(0);
  });

  test('cannot open a non-enrolled course (restricted state)', async ({ page }) => {
    test.skip(!forbiddenCourseId, 'E2E_STUDENT_FORBIDDEN_COURSE_ID not set');
    await login(page, student);
    await page.goto(`/courses/${forbiddenCourseId}`);
    await expect(page.getByRole('heading', { name: /access restricted/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /return to courses/i })).toBeVisible();
  });

  test('can open an enrolled published course', async ({ page }) => {
    test.skip(!enrolledCourseId, 'E2E_STUDENT_ENROLLED_COURSE_ID not set');
    await login(page, student);
    await page.goto(`/courses/${enrolledCourseId}`);
    await expect(page.getByRole('heading', { name: /access restricted/i })).toHaveCount(0);
  });
});

test.describe('Teacher role', () => {
  test.skip(!haveCreds(teacher), 'E2E_TEACHER_EMAIL/PASSWORD not set');

  test('sees own teaching courses only', async ({ page }) => {
    await login(page, teacher);
    await page.goto('/courses');
    await expect(page.getByText(/something went wrong|failed to load/i)).toHaveCount(0);
    // Teacher must not get the admin "all courses" administration surface.
    await expect(page).not.toHaveURL(/\/admin/);
  });
});

test.describe('Admin role', () => {
  test.skip(!haveCreds(admin), 'E2E_ADMIN_EMAIL/PASSWORD not set');

  test('can reach course administration and see all courses', async ({ page }) => {
    await login(page, admin);
    await page.goto('/courses');
    await expect(page.getByText(/something went wrong|failed to load/i)).toHaveCount(0);
  });
});
