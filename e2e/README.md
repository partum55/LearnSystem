# LearnSystem E2E — role-access walkthrough

Opt-in Playwright spec that exercises the role/authorization matrix against a **running** deployment
(production or staging). It is isolated from the web app build (its own `package.json`, outside the
`apps/web` TypeScript project) so it never affects `npm run typecheck` / `npm run build`.

## Credentials policy

This runner is **credential-free by design**. It reads the dedicated E2E accounts (see
`docs/e2e-testing.md`) from environment variables and **skips** any test whose credentials are
absent. Do **not** commit passwords, and do not invent them.

## Required / optional environment variables

| Variable | Purpose |
| --- | --- |
| `E2E_BASE_URL` | App base URL (default `https://learnsystem.app`) |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Admin account |
| `E2E_TEACHER_EMAIL` / `E2E_TEACHER_PASSWORD` | Teacher account |
| `E2E_STUDENT_EMAIL` / `E2E_STUDENT_PASSWORD` | Student account |
| `E2E_STUDENT_ENROLLED_COURSE_ID` | A PUBLISHED course the student **is** enrolled in |
| `E2E_STUDENT_FORBIDDEN_COURSE_ID` | A course the student is **not** enrolled in (expects restricted state) |

## Run

```bash
cd e2e
npm install
npm run install:browsers

# supply credentials at run time (example — never commit these):
export E2E_BASE_URL=https://learnsystem.app
export E2E_STUDENT_EMAIL=e2e_student@learnsystem.app
export E2E_STUDENT_PASSWORD=...        # from your secret store
# ...admin/teacher vars as needed...

npm test            # headless
npm run test:headed # headed (visual validation)
```

## Coverage

- Unauthenticated `/courses` → redirects to `/login`.
- Student: sees only enrolled courses; non-enrolled/draft course deep-link → `Access restricted`
  (`RestrictedAccessState`); enrolled published course opens.
- Teacher: sees own teaching courses, not the admin surface.
- Admin: course administration loads without errors.

## Notes

- Login selectors target accessible labels/roles (`getByLabel(/email/i)`, the sign-in button). If the
  login form markup changes, adjust the `login()` helper in `tests/role-access.spec.ts`.
- After a frontend deploy, wait ≥90s and use a fresh context before retesting (see
  `docs/e2e-testing.md`).
