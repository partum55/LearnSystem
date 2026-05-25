# LearnSystem Production Course Lifecycle E2E Report

## Date / Time

- 2026-05-26 01:24:38 +03:00
- App URL: https://app.learnsystem.app
- API URL: https://api.learnsystem.app
- Production host: `root@167.99.240.242`, `/opt/learnsystem`

## Test Users

- ADMIN: `e2e_admin@learnsystem.app` / password masked
- TEACHER: `e2e_teacher@learnsystem.app` / password masked
- STUDENT: `e2e_student@learnsystem.app` / password masked

## Test Data Created

- Course: `E2E_TEST_Course_Full_Flow`
- Course code: `E2E_FULL_FLOW`
- Course ID: `32833e4e-2a06-4b02-85c5-f1cb7df0df03`
- Module: `E2E_TEST_Module_1`
- Module ID: `1d70284d-5f88-4663-8c5b-a69af681710b`
- Lesson: `E2E_TEST_Lesson_1`
- Learning item ID: `bbf8bd75-eaef-44f3-8867-6e5398148f85`
- Assignment: `E2E_TEST_Assignment_1`
- Assignment ID: `1d33b583-b7ce-4d47-82ed-1f47b7b0f15c`
- Submission ID: `969c354a-60a8-484e-8af4-fbaeeab4512c`
- Grade: `9 / 10`
- Feedback: `E2E_TEST feedback`

## Step Results

| Step | Result | Notes |
| --- | --- | --- |
| ADMIN smoke dashboard | PASS | Dashboard loaded. Admin Users, Courses, Groups opened without UI crash. |
| TEACHER create course | PASS | Course created and opened. |
| Course page no console crash | PASS | Course page loaded; later route/API issues were isolated below. |
| Add STUDENT to course | PASS after fix | Initial member add failed because learning-service could not call user-service profile lookup. |
| Create module | PASS | Module appeared in course Modules tab. |
| Create lesson / material | PASS after fix | Backend returned uppercase `LESSON`; frontend detail page expected lowercase. Fixed to canonical uppercase. Canvas lesson editor opened and page content saved. |
| Create assignment | PASS after DB fix | Initial create returned 500 due legacy DB `description NOT NULL`. Fixed by relaxing legacy constraint. |
| Student opens assignment | PASS after gateway fix | Initial `/api/v1/assignments/{id}` returned 404 because gateway only routed legacy `/api/assignments/**`. |
| Student submits assignment | PARTIAL PASS | Canonical API `/submissions/text` returned 201 and UI showed `SUBMITTED`; current production frontend bundle still called stale `/submissions/rte` during the run. Frontend fix was committed/pushed. |
| Teacher grades assignment | PASS | SpeedGrader saved draft score `9` and feedback. |
| Teacher publishes grade | PASS | Release Grades published the score. |
| Teacher full gradebook | PASS | Full gradebook showed `9.0 / 10 Sent`. |
| Student dashboard/grades | PASS | Dashboard showed course grade `90%`; Course Grades tab showed `9.0 / 10.0` and feedback. |
| Cleanup | NOT RUN | No clearly safe delete/archive UI was used. E2E artifacts were left in production intentionally. |

## Screenshots

Screenshots are under `C:\Users\partu\OneDrive\Desktop\LearnSystemUCU\e2e-production-full-flow`.

Key screenshots:

- `01-admin-dashboard.png`
- `04-admin-groups.png`
- `09-created-course-or-error.png`
- `15-member-after-fix-enroll.png`
- `19-module-created-or-error.png`
- `23-lesson-editor-or-error.png`
- `25-assignment-visible-in-module.png`
- `31-student-assignment-after-route-fix.png`
- `38-student-submitted-status.png`
- `45-speedgrader.png`
- `49-teacher-grade-published.png`
- `50-teacher-full-gradebook-score.png`
- `51-student-course-grades.png`
- `53-student-dashboard-new-tab.png`

## Browser / Network Errors

1. Add member failed initially:
   - Request: `POST /api/v1/courses/32833e4e-2a06-4b02-85c5-f1cb7df0df03/members`
   - Status: 404 surfaced in UI flow
   - Root cause: learning-service profile lookup pointed at default `http://localhost:8081` and missed user-service `/api` context path in Docker.

2. Course members panel repeatedly failed before gateway fix:
   - Request: `GET /api/v1/courses/{courseId}/enrollment-groups`
   - Status: 404
   - Root cause: gateway did not route enrollment group endpoints.

3. Assignment create failed:
   - Request: `POST /api/v1/courses/32833e4e-2a06-4b02-85c5-f1cb7df0df03/modules/1d70284d-5f88-4663-8c5b-a69af681710b/assignments`
   - Status: 500
   - Response: generic unexpected error in UI.
   - Root cause: production DB still had `learning.assignments.description NOT NULL`.

4. Student assignment detail failed:
   - Request: `GET /api/v1/assignments/1d33b583-b7ce-4d47-82ed-1f47b7b0f15c`
   - Status: 404
   - Root cause: gateway route only matched `/api/assignments/**`, not canonical `/api/v1/assignments/**`.

5. Student UI submit failed during run:
   - Request: `POST /api/v1/assignments/1d33b583-b7ce-4d47-82ed-1f47b7b0f15c/submissions/rte`
   - Status: 500
   - Root cause: frontend used stale/non-canonical `/submissions/rte`; backend canonical controller exposes `/submissions/text` for `TEXT_SUBMISSION`.
   - Fix committed: frontend now calls `/submissions/text`. During this E2E run, the live app bundle still used `/rte`, so the submission was completed via authenticated canonical API call and verified in UI afterwards.

## Backend Log Findings

- `learning-service` assignment create:
  - `SQLState 23502`
  - `ERROR: null value in column "description" of relation "assignments" violates not-null constraint`
  - Stack included `CanonicalAssignmentService.createAssignment` and `CanonicalAssignmentController.create`.

- `learning-service` stale submit route:
  - `NoResourceFoundException: No static resource v1/assignments/.../submissions/rte`
  - Confirmed `/rte` is not a canonical backend route.

- `caddy` after fixes:
  - `GET /api/v1/assignments/{id}` returned 200 after gateway rebuild.
  - `POST /api/v1/assignments/{id}/submissions/text` returned 201 via authenticated API call.

## Fixes Made

- `infra/docker/docker-compose.prod.yml`
  - Set `USER_SERVICE_URL=http://user-service:8081/api` for learning-service.
  - Passed `INTERNAL_SERVICE_TOKEN` into user-service and learning-service.

- `services/gateway/src/main/resources/application.yml`
  - Added `enrollment-groups` learning route.
  - Added canonical `/api/v1/assignments/**` to assignment route.

- `services/gateway/src/main/resources/application-docker.yml`
  - Same route fixes as main gateway config.

- `services/gateway/src/test/java/com/university/lms/apigateway/config/GatewayRouteContractTest.java`
  - Added route contract coverage for enrollment groups and canonical assignments.

- `apps/web/src/features/courses/api/canonical.types.ts`
  - Canonical learning item type literals moved to uppercase.

- `apps/web/src/features/courses/components/LearningItemFormModal.tsx`
  - Learning item create/edit values now use canonical uppercase types.

- `apps/web/src/features/learning-items/components/LearningItemDetailPage.tsx`
  - Normalizes item type to uppercase and compares against canonical uppercase values.

- `supabase/migrations/20260526000000_relax_assignment_legacy_description.sql`
  - Drops legacy `NOT NULL` constraint from `learning.assignments.description`.

- `apps/web/src/features/assignments/api/assignments.api.ts`
  - `TEXT_SUBMISSION` submit endpoint now uses `/submissions/text`.

- `apps/web/src/features/assignments/hooks/useAssignmentQueries.ts`
  - `TEXT_SUBMISSION` now calls `submitText`.

## Deploy / Production Actions

- Rebuilt/recreated production backend services after compose/gateway changes.
- Applied DB migration manually to production DB:
  - `ALTER TABLE learning.assignments ALTER COLUMN description DROP NOT NULL;`
- Rebuilt/recreated gateway after adding `/api/v1/assignments/**`.
- Pulled pushed commits on droplet; current pulled commit after fixes: `dd2af3c`.

## Checks Run

- Production Docker health:
  - `docker compose -f infra/docker/docker-compose.prod.yml ps -a`
  - All services healthy/running.
- API health:
  - `curl -i https://api.learnsystem.app/api/v1/actuator/health`
  - Returned `HTTP/2 200 {"status":"UP"}`.
- Production gateway Docker build:
  - `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml build --progress=plain gateway`
  - Build succeeded.
- Local checks attempted but not available in this Windows environment:
  - `pnpm tsc --noEmit` failed: `pnpm` command not found.
  - `mvn -pl services/gateway test` failed: `mvn` command not found.

## Cleanup Status

- Cleanup not performed.
- Reason: deleting/archive via UI was not clearly safe during production debugging. The created E2E course and related data remain:
  - `E2E_TEST_Course_Full_Flow`
  - `E2E_TEST_Module_1`
  - `E2E_TEST_Lesson_1`
  - `E2E_TEST_Assignment_1`
  - Student submission and published grade.

## Remaining Blockers / Follow-up

- Verify once the production frontend deployment has definitely picked up commit `dd2af3c` that the UI submit button sends `/api/v1/assignments/{id}/submissions/text` instead of stale `/submissions/rte`.
- Optional cleanup/archive the E2E course from production once a safe admin/course cleanup path is confirmed.
