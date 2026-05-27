# E2E Testing

## Production Test Users

Use the dedicated E2E accounts:

- `e2e_admin@learnsystem.app`
- `e2e_teacher@learnsystem.app`
- `e2e_student@learnsystem.app`

Do not document actual passwords.

## Browser Testing Rules

- Use a headed browser for visual click-through when validating production.
- Use visible UI, labels, and navigation.
- Do not type guessed routes to manufacture a pass.
- If a required control is missing, mark `NOT_FOUND_IN_UI` instead of `PASS`.
- Capture console errors and failed network requests.
- Use fresh browser contexts for auth-sensitive tests.

## Core Flows

Admin smoke:

1. Login as admin.
2. Open dashboard.
3. Verify admin widgets load without fake data.
4. Open user/course administration where available.

Teacher course lifecycle:

1. Login as teacher.
2. Create course.
3. Enroll existing student.
4. Create module.
5. Create lesson/material.
6. Create assignment.
7. Login as student.
8. Submit assignment.
9. Login as teacher.
10. Grade draft and publish.
11. Login as student.
12. Verify published grade is visible.

AI readiness:

1. Open Profile -> AI Settings.
2. Verify provider status.
3. Save/replace/delete a Gemini key only with a test key.
4. Confirm raw keys are never returned.

AI generation if enabled:

1. Run `GENERATE_COURSE` through visible UI.
2. Review generated draft.
3. Confirm course creation.
4. Verify no generated object auto-publishes unexpectedly.

QR attendance:

1. Teacher creates a seminar assignment.
2. Teacher starts a QR session.
3. Student opens `/seminars/check-in?token=...` from the displayed QR/link.
4. Verify login redirect returns to check-in if needed.
5. Verify success and duplicate check-in behavior.

Gradebook:

1. Teacher opens Course -> Grades.
2. Verify summary view.
3. Open full gradebook.
4. Filter/open assignment mode.
5. Open SpeedGrader.

Course people/enrollment:

1. Add existing user by email.
2. Run CSV bulk preview.
3. Confirm valid rows.
4. Verify group linking behavior.

## Artifacts

Planned:

- Safe cleanup/archive strategy for E2E screenshots, traces, and reports.
