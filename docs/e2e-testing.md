# E2E Testing

## Production Test Users

Use the dedicated E2E accounts:

- `e2e_admin@learnsystem.app`
- `e2e_teacher@learnsystem.app`
- `e2e_student@learnsystem.app`

Do not document actual passwords.

## Headed Browser Rules

- Use a headed browser for visual production validation.
- Use visible UI only: clicked labels, buttons, menus, tabs, and links.
- Do not type guessed routes to manufacture a pass.
- Record clicked labels and the current URL for each major step.
- If a required control is missing, mark `NOT_FOUND_IN_UI` instead of `PASS`.
- Capture console errors and failed network requests.
- Use fresh browser contexts for auth-sensitive tests.
- After frontend push, wait at least 90 seconds before production UI testing.
- Use a fresh browser context or hard refresh before retesting deployed frontend changes.

## Course Status Flows

Draft access:

1. Teacher creates a course.
2. Verify the course is `DRAFT`.
3. Enroll the student.
4. Login as student.
5. Verify the draft course is hidden from the student.

Published access:

1. Owner/admin publishes the course.
2. Login as student.
3. Verify the course appears in Active Courses.
4. Open it from visible UI.

Archived behavior:

1. Owner/admin archives a draft or published course.
2. Verify the course appears in Archived Courses.
3. Verify admin and owner can edit, restore, and delete.
4. Verify teacher, TA, and student can open the archived course as read-only viewers.
5. Verify stored `role_in_course` values are unchanged.

## AI Flows

AI readiness:

1. Open Profile -> AI Settings.
2. Verify provider status.
3. Save/replace/delete a Gemini key only with a test key.
4. Use Test connection.
5. Confirm raw keys are never returned.

AI generation:

1. Trigger `GENERATE_COURSE` through visible UI.
2. Verify the network request is `POST /api/v1/ai/tasks`.
3. Review the generated draft.
4. Confirm course creation.
5. Verify the network request is `POST /api/v1/courses/from-draft`.
6. Verify no generated course, module, material, assignment, or grade auto-publishes.

AI grade suggestion:

1. Create a real assignment and student submission.
2. Open SpeedGrader through visible UI.
3. Trigger AI suggest grade.
4. Verify `POST /api/v1/ai/tasks`.
5. Verify suggested points/feedback fill local fields only.
6. Manually save draft grade.
7. Manually publish grade.
8. Login as student and verify only the published grade is visible.

## Core Product Flows

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
7. Publish course and required content.
8. Login as student.
9. Submit assignment.
10. Login as teacher.
11. Grade draft and publish.
12. Login as student.
13. Verify published grade is visible.

QR attendance:

1. Teacher creates a seminar assignment.
2. Teacher starts a QR session.
3. Student follows the visible QR/link flow.
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
2. Run CSV bulk preview from visible UI.
3. Confirm valid rows from visible UI.
4. Verify group linking behavior.

## Artifacts

- Use safe cleanup/archive for E2E screenshots, traces, generated courses, and generated users.
- Do not include secrets, passwords, API keys, bearer tokens, cookies, or full env files in reports.
