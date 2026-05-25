# Course Page Production Debug Report

Date/time: 2026-05-26 00:23 Europe/Kyiv (2026-05-25 21:23 UTC)

## Scope

Production targets checked:
- Frontend: https://app.learnsystem.app
- Backend API: https://api.learnsystem.app
- Droplet project: `/opt/learnsystem`

Pages/areas targeted:
- Course page initial load
- Course members/people data used by the Course page
- Course modules/materials requests observed in production logs
- Tabs requested for follow-up browser validation: Overview, Modules, People/Members, Grades

Browser login status:
- Tried legacy dev credentials `teacher@test.com / Teacher123!`; production returned `Invalid login credentials`.
- Re-ran with the provided E2E teacher session in the in-app browser.
- Authenticated Course page, tabs, and learning item navigation were verified.

## Production Health

Initial checks:
- `docker compose -f infra/docker/docker-compose.prod.yml ps -a`: `gateway`, `learning-service`, `user-service`, `redis`, and `caddy` were running; backend services were healthy.
- `curl -i https://api.learnsystem.app/api/v1/actuator/health`: returned `HTTP/2 200` with `{"status":"UP"}`.

After first fix/redeploy:
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml build --progress=plain`: build succeeded.
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml up -d --force-recreate`: services recreated.
- `docker compose -f infra/docker/docker-compose.prod.yml ps -a`: `gateway`, `learning-service`, `user-service`, and `redis` healthy; `caddy` running.
- `curl -i https://api.learnsystem.app/api/v1/actuator/health`: returned `HTTP/2 200` with `{"status":"UP"}`.

After second fix/redeploy:
- Added gateway route for `/api/v1/learning-items/**`.
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml build --progress=plain`: build succeeded.
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml up -d --force-recreate`: services recreated.
- `docker compose -f infra/docker/docker-compose.prod.yml ps -a`: `gateway`, `learning-service`, `user-service`, and `redis` healthy; `caddy` running.
- `curl -i https://api.learnsystem.app/api/v1/actuator/health`: returned `HTTP/2 200` with `{"status":"UP"}`.

## Browser Console / Network

Authenticated browser reproduction was completed using the E2E teacher session.

Course page tested:
- `https://app.learnsystem.app/courses/2a78267b-0ddf-45ca-a046-d6888c42467c`
- Console warnings/errors: none captured in the in-app browser for Overview, Modules, Members, Grades, or the learning item detail page.

Tabs tested:
- Overview: loaded successfully.
- Modules: loaded successfully and showed one lesson item.
- Members: loaded successfully and showed `1` enrolled teaching staff member.
- Grades: navigated to `/courses/2a78267b-0ddf-45ca-a046-d6888c42467c/gradebook` and loaded the teacher gradebook overview.
- Learning item link from Modules: initially reproduced `Resource Not Found`, then passed after gateway route fix.

Production Caddy access logs provided real browser network evidence from Course page usage:

- `GET /api/v1/courses/2a78267b-0ddf-45ca-a046-d6888c42467c/members?size=100`
  - Status: `500`
  - Repeated several times around `2026-05-25T21:01:13Z` to `2026-05-25T21:01:23Z`
  - Request had `Authorization: Bearer ...`, `Origin: https://app.learnsystem.app`
  - This is the Course page members/people request triggered by `useCourseMembers(courseId, { size: 100 })`.

- `GET /api/v1/learning-items/51745e52-5270-4505-8f43-487ba1de198f`
  - Status: `404`
  - Reproduced by clicking the lesson card in Modules.
  - Root cause: gateway had no `/api/v1/learning-items/**` route, so the request did not reach learning-service.
  - After gateway fix/redeploy, the same request returned `200` and the page rendered the lesson detail (`Type: LESSON`, `VISIBLE`).

- `GET /api/v1/courses/2a78267b-0ddf-45ca-a046-d6888c42467c/gradebook/me`
  - Status: `403`
  - Triggered while viewing the Course page as teacher/owner.
  - Root cause: CourseDetailPage eagerly ran the student gradebook query for staff users.
  - Local frontend fix added: `useStudentGradebook(courseId, !isCourseStaff)`.
  - Production frontend still needs redeploy for this specific request to stop appearing.

## Backend Logs

Relevant learning-service error before the fix:

- Exception: `org.springframework.data.mapping.PropertyReferenceException: No property 'createdAt' found for type 'CourseMember'`
- Request path correlated from Caddy: `GET /api/v1/courses/{courseId}/members?size=100`
- Stack path:
  - `CourseMemberRepository.findByCourseId(...)`
  - `CanonicalCourseMemberService.list(...)`
  - `CanonicalCourseMemberController.getCourseMembers(...)`

Post-deploy log tail:
- `learning-service` started successfully.
- `gateway` started successfully.
- No new `PropertyReferenceException` appeared in the post-deploy log tail.
- Caddy showed post-fix `GET /api/v1/courses/{courseId}/members?size=100` returning `200`.
- Caddy showed post-fix `GET /api/v1/learning-items/{learningItemId}` returning `200`.

## Frontend Code Audit

Files inspected:
- `apps/web/src/api/client.ts`
- `apps/web/src/features/courses/components/CourseDetailPage.tsx`
- `apps/web/src/features/courses/api/courses.api.ts`
- `apps/web/src/features/courses/hooks/useCourseQueries.ts`
- `apps/web/src/features/courses/components/MembersPanel.tsx`
- `apps/web/src/features/gradebook/api/gradebook.api.ts`
- `apps/web/src/features/learning-items/api/learning-items.api.ts`
- `apps/web/src/features/learning-items/components/LearningItemDetailPage.tsx`
- `services/gateway/src/main/resources/application.yml`
- `services/gateway/src/main/resources/application-docker.yml`
- `services/gateway/src/test/java/com/university/lms/apigateway/config/GatewayRouteContractTest.java`

Findings:
- Course page calls `useCourseMembers(courseId, { size: 100 })`.
- `useCourseMembers` calls `canonicalCoursesApi.getMembers`.
- `canonicalCoursesApi.getMembers` uses the canonical frontend path `/v1/courses/{courseId}/members`.
- `apiClient` asserts `/v1` paths and sends the Supabase `Authorization: Bearer` token.
- With `NEXT_PUBLIC_API_URL=https://api.learnsystem.app/api`, this becomes `https://api.learnsystem.app/api/v1/courses/{courseId}/members`.
- No duplicated `/api/v1/v1` or `/v1/v1` pattern was found in the inspected active frontend Course page code.
- Gradebook frontend calls are canonical course-scoped routes:
  - `/v1/courses/{courseId}/gradebook/me`
  - `/v1/courses/{courseId}/gradebook`
  - `/v1/courses/{courseId}/gradebook/cells`
  - `/v1/courses/{courseId}/gradebook/publish`
- Members bulk endpoints are already canonical:
  - `/v1/courses/{courseId}/members/bulk/preview`
  - `/v1/courses/{courseId}/members/bulk/confirm`
- Enrollment groups use `/v1/enrollment-groups` and `/v1/courses/{courseId}/enrollment-groups`.
- Learning item detail frontend call is canonical: `/v1/learning-items/{learningItemId}`.
- Before the second backend fix, the frontend call was correct but the gateway did not route it.

## Root Cause

Primary fixed root cause:

The frontend made a valid Course page members request:

`GET /api/v1/courses/{courseId}/members?size=100`

The backend controller defaulted `sortBy` to `createdAt`:

`@RequestParam(defaultValue = "createdAt") String sortBy`

But `CourseMember` does not have a `createdAt` field. Its canonical timestamp for enrollment creation is `addedAt`, mapped to database column `added_at`.

Spring Data tried to build a pageable query sorted by `createdAt`, failed with `PropertyReferenceException`, and returned `500`.

Second fixed root cause:

The frontend made a valid canonical learning item request:

`GET /api/v1/learning-items/{learningItemId}`

The learning-service controller exposes:

`GET /api/v1/learning-items/{learningItemId}`

But the gateway config only routed course-scoped canonical paths like `/api/v1/courses/**`; it did not route `/api/v1/learning-items/**`. The gateway returned `404`, which the frontend displayed as `Resource Not Found`.

Third root cause fixed locally:

CourseDetailPage called the student gradebook endpoint for staff users:

`GET /api/v1/courses/{courseId}/gradebook/me`

For the E2E teacher/owner this returns `403`. It does not crash the visible teacher UI, but it is still a wrong frontend call on Course page. The local fix disables the student gradebook query for course staff.

## Fix Applied

Changed the default sort field for course members:

- `services/learning-service/src/main/java/com/university/lms/course/courses/controller/CanonicalCourseMemberController.java`
  - from `createdAt`
  - to `addedAt`

No compatibility fields, fake data, frontend hacks, or backend validation weakening were added.

The same one-line fix was applied locally and on the production droplet under `/opt/learnsystem`.

Added canonical learning item route to gateway:

- `services/gateway/src/main/resources/application.yml`
- `services/gateway/src/main/resources/application-docker.yml`
  - added route `learning-items`
  - predicate: `/api/v1/learning-items/**`

Added gateway route contract coverage:

- `services/gateway/src/test/java/com/university/lms/apigateway/config/GatewayRouteContractTest.java`
  - asserts the `learning-items` route exists in both gateway configs.

Fixed the staff-only Course page frontend request locally:

- `apps/web/src/features/gradebook/hooks/useGradebookQueries.ts`
  - `useStudentGradebook` now accepts an `enabled` flag.
- `apps/web/src/features/courses/components/CourseDetailPage.tsx`
  - student gradebook query is disabled for course staff.

## Checks

Passed:
- Production Docker build completed successfully.
- `learning-service` compiled during Docker build.
- `gateway` compiled during Docker build.
- Production services recreated successfully.
- Docker health checks show backend services healthy.
- Public API health endpoint returns `HTTP/2 200 {"status":"UP"}`.
- Post-deploy `learning-service` and `gateway` log tails show successful startup.
- Authenticated browser check as E2E teacher:
  - Overview: no console errors.
  - Modules: no console errors.
  - Members: no console errors.
  - Grades: no console errors.
  - Learning item detail: no console errors and no longer shows `Resource Not Found`.
- Caddy access logs confirmed:
  - members endpoint now returns `200`.
  - learning item endpoint now returns `200`.

Blocked / not run:
- Local `pnpm tsc --noEmit`: blocked because `pnpm` is not installed in local PATH.
- Local `pnpm build`: blocked because `pnpm` is not installed in local PATH.
- Local `npm run typecheck` / `npm run build`: blocked because `npm` is not installed in local PATH.
- Local `mvn test`: blocked because `mvn` is not installed and no Maven wrapper exists in `services/`.
- Docker build uses `-DskipTests`, so it is a compile/package verification, not a full Maven test run.
- Full local frontend verification is blocked by missing Node package tooling/dependencies in this workspace.
- The frontend `gradebook/me` guard is in local source but has not been verified on production because the production frontend needs a separate deploy.

## Remaining

- Deploy the frontend changes so the teacher Course page stops issuing `/gradebook/me`.
- Run `pnpm tsc --noEmit` and `pnpm build` in an environment with Node/npm/pnpm and installed dependencies.
- Run full Maven tests in an environment with Maven, or adjust Docker build/test workflow to run tests without `-DskipTests`.
