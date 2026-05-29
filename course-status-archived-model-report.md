# Course Status / Archived Courses Production Rollout Report

Date/time: 2026-05-29 13:17 +03:00

Scope: Course lifecycle / archived courses only. AI, design refresh, and unrelated feature work were not included.

## Production Target

- App: https://app.learnsystem.app
- API: https://api.learnsystem.app
- Production path: `/opt/learnsystem`
- Latest deployed commit: `5013edf` (`Return bad request for malformed learning payloads`)

Recent rollout commits:

- `5013edf` Return bad request for malformed learning payloads
- `19b3cc5` Update attendance test for archived mutation guard
- `5e83f15` Align course lifecycle policy with user schema
- `e9775da` Fix course lifecycle migration policy dependency
- `b0506a9` Implement course lifecycle archived model

## Code Pull

Production was pulled to latest `main` at `5013edf`.

Commands run on production:

- `git status`
- `git pull`
- `git log --oneline -5`

## Database Inspection

Pre-migration status counts:

| status | count |
| --- | ---: |
| DRAFT | 3 |

The requested recent-course query using `title` did not match production schema because `learning.courses` has `title_uk` / `title_en`, not `title`. The safe inspection was rerun with the real columns.

Recent pre-migration courses:

| id | title_uk | code | status |
| --- | --- | --- | --- |
| `0ac478b9-a330-42d4-a886-28ab9a047f14` | Practical JavaScript Testing with TDD | JS-TDD-101 | DRAFT |
| `3f95ee0f-4d19-40b0-ac9f-837ee754c7fe` | AI E2E Production Polish | AIE2E056135 | DRAFT |
| `52fa5bd3-3863-4ad1-a9e4-3af3d6774585` | 1 | 123 | DRAFT |

Pre-migration `learning.courses.visibility`:

- Column existed as a user-defined enum.
- Values: `DRAFT = 3`.

## Migration Result

Migration applied:

- `supabase/migrations/20260529010000_course_status_lifecycle_only.sql`

Initial attempts failed and rolled back safely:

- Policy dependency blocked altering `learning.courses.status`; fixed by dropping/recreating affected policies first.
- Replacement policy referenced nonexistent `public.users.is_deleted`; fixed to match the actual user schema.

Final migration result:

- Transaction committed.
- `schema_migrations` recorded version `20260529010000`.
- No manual destructive SQL was run outside the migration.

## Post-Migration Verification

Post-migration status counts:

| status | count |
| --- | ---: |
| DRAFT | 3 |

Confirmed:

- `learning.courses.status` uses `learning.course_status`.
- Valid lifecycle values are `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `learning.courses.visibility` query returned zero rows.
- `pg_type typname = 'course_visibility'` returned zero rows.
- CourseVisibility is gone from the production DB model.

## Backend Tests

Passed on production host with Dockerized Maven:

- `learning-service`: 31 tests, 0 failures.
- `gateway`: 4 tests, 0 failures.

Relevant fixes verified by tests:

- Archived mutation guard test now expects `requireTeacherMutation`.
- Malformed/unknown learning payloads, including legacy `visibility`, return `400` instead of `500`.

## Frontend Checks

Production host:

- `npm ci` inside the Node container was killed with exit `137` due host memory pressure before typecheck/build could run.

Local verification from this workspace:

- `apps/web`: `npm.cmd run typecheck` passed.
- `apps/web`: `npm.cmd run build` passed.

## Deployment

Production commands completed:

- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml config --quiet`
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml build --progress=plain learning-service gateway caddy`
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml up -d --force-recreate learning-service gateway caddy`
- `docker compose -f infra/docker/docker-compose.prod.yml ps -a`

Service state after deploy:

- `lms-learning-service`: healthy
- `lms-gateway`: healthy
- `lms-caddy`: running
- Existing `user-service`, `ai-service`, and `redis`: running/healthy

Health check:

- `GET https://api.learnsystem.app/api/v1/actuator/health`
- Result: `HTTP 200`, `{"status":"UP"}`

## API Smoke

API smoke course:

- Name: `E2E_TEST_STATUS_LIFECYCLE`
- Code: `E2E_STATUS_100710`
- ID: `ab16bae2-3503-48a9-a8c5-fc660afb265e`
- Cleanup: hard deleted

Passed:

- Create course returns `201`.
- Default status is `DRAFT`.
- Create/settings responses have no `visibility`.
- `PATCH /api/v1/courses/{courseId}/settings` with legacy `visibility` returns `400`.
- Student does not see draft in active courses.
- Publish transitions to `PUBLISHED`.
- Student sees published member course in active courses.
- Archive transitions to `ARCHIVED`.
- Teacher/owner active list excludes archived course.
- Teacher/student archived list includes archived course via `GET /api/v1/courses?status=ARCHIVED`.
- Student archived settings mutation returns `403`.
- Owner archived settings mutation returns `200`.
- Admin archived settings read returns `200`.
- Restore transitions `ARCHIVED -> DRAFT`.
- Student no longer sees restored draft.
- Delete returns `204`.
- Deleted course returns `404`.
- DB cleanup counts for course, members, modules, learning items, and assignments were zero.

## Headed Browser Smoke

Artifact directory:

- `C:/Users/partu/OneDrive/Desktop/LearnSystemUCU/course-lifecycle-prod-artifacts-2026-05-29T10-08-10-567Z`

Primary UI course:

- Name: `E2E_TEST_STATUS_LIFECYCLE_UI`
- Code: `E2E_UI_100749`
- ID: `cfb08aa8-a881-4d75-8ae7-47c51bec3fdb`
- Cleanup: deleted through production UI

Verified:

- Owner sees Archived Courses tab.
- Archived course appears only in Archived Courses.
- Course card shows `ARCHIVED` badge.
- Archived banner shows `This course is archived.`
- Owner/admin copy shows `You can restore, edit, or delete this archived course.`
- Settings tab has status badge and lifecycle buttons.
- No visibility field/dropdown exists.
- Student sees archived course in Archived Courses.
- Student archived detail shows `This course is read-only.`
- Student has no Settings tab, Create Module, Add learning material, Add assignment, submit/resubmit, or member-management controls.
- Admin sees archived course and Settings/Restore/Delete controls.
- Delete confirmation requires typing `DELETE`.
- After UI deletion, Archived Courses showed `Archived Courses (0)` and `No archived courses.`

Non-owner teacher UI course:

- Name: `E2E_TEST_STATUS_TEACHER_READONLY`
- Code: `E2E_TCH_101906`
- ID: `bf776c38-d2af-43d3-aee5-35f04d1fd344`
- Admin created course, added teacher as stored `TEACHER`, archived it, then deleted it.
- Cleanup: deleted through production UI

Verified:

- Non-owner TEACHER did not see the archived course in Active Courses.
- Non-owner TEACHER saw it in Archived Courses.
- Detail showed stored role `TEACHER`.
- Detail showed `This course is read-only.`
- No Settings tab was visible.
- No Create Module, Add learning material, Add assignment, or member-management controls were visible.
- Modules tab stayed read-only.

TA was not separately tested because no E2E TA account was provided.

## Cleanup Verification

Final DB verification:

| check | result |
| --- | --- |
| `cfb08aa8-a881-4d75-8ae7-47c51bec3fdb` exists | false |
| `bf776c38-d2af-43d3-aee5-35f04d1fd344` exists | false |
| remaining members/modules/learning items/assignments for E2E courses | 0 |
| final production course statuses | DRAFT = 3 |

Users and user AI keys were not deleted.

## Browser Artifacts

Screenshots captured:

- `01-initial.png`
- `02-dashboard-loaded.png`
- `03-courses-page.png`
- `04-archived-courses-tab.png`
- `05-archived-course-detail-owner.png`
- `06-course-settings-no-visibility.png`
- `07-student-archived-courses-tab.png`
- `08-student-archived-course-readonly.png`
- `09-student-archived-modules-no-controls.png`
- `10-admin-archived-courses-tab.png`
- `11-admin-archived-course-controls.png`
- `12-admin-settings-restore-delete.png`
- `13-admin-delete-confirmation.png`
- `14-after-ui-course-delete.png`
- `15-admin-archived-empty-after-delete.png`
- `16-admin-create-nonowner-teacher-course-form.png`
- `17-admin-nonowner-course-created.png`
- `18-admin-members-tab-before-teacher-add.png`
- `19-admin-add-teacher-dialog.png`
- `20-admin-teacher-enrolled.png`
- `21-admin-nonowner-course-settings-before-archive.png`
- `22-admin-nonowner-course-archived.png`
- `23-admin-nonowner-course-archive-confirmed.png`
- `24-teacher-courses-active-before-archived.png`
- `25-teacher-nonowner-archived-courses-tab.png`
- `26-teacher-nonowner-archived-readonly-detail.png`
- `27-teacher-nonowner-archived-modules-no-controls.png`
- `28-admin-nonowner-course-cleanup-archived-tab.png`
- `29-after-nonowner-course-delete.png`
- `browser-console-errors.json`

Browser diagnostics:

- Console warnings/errors: none captured.
- No blocking failed network request was observed during the smoke flows.
- One sidebar `Courses` click in the in-app browser did not navigate; the visible `/courses` href was used as a fallback. Other visible course links worked.

## Remaining TODOs

- Add a dedicated TA E2E account if TA-specific production UI smoke is required.
- Investigate the in-app-browser sidebar navigation anomaly if it reproduces outside this test session.
- Increase production host memory or use a larger build runner if frontend checks must run directly on the droplet without OOM.
