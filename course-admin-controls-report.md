# Course Administration Controls Report

## Endpoints Added

- `GET /api/v1/courses/{courseId}/settings`
- `PATCH /api/v1/courses/{courseId}/settings`
- `POST /api/v1/courses/{courseId}/archive`
- `POST /api/v1/courses/{courseId}/restore`
- `DELETE /api/v1/courses/{courseId}`

Existing admin endpoints under `/api/v1/admin/courses` remain available for platform admins.

## Permission Checks

- Backend settings, archive, restore, publish/unpublish, update, and delete now require global `ADMIN` or active `course_members.role_in_course = OWNER`.
- Global `TEACHER` is not treated as course owner.
- Course `TEACHER`, `TA`, and `STUDENT` receive backend-side forbidden errors for base course settings and destructive course actions.
- `DELETE /api/v1/courses/{courseId}` is intentionally implemented as a soft delete by setting course status to `ARCHIVED`; it does not hard-delete course rows or related learning records.

## Validation

- Settings update requires `code` and primary title.
- Course code uniqueness is checked when updating settings.
- Status and visibility use canonical uppercase Java enums: `DRAFT`, `PUBLISHED`, `ARCHIVED` and `DRAFT`, `PRIVATE`, `PUBLIC`.
- Settings payload accepts only canonical course settings fields through `UpdateCourseSettingsRequest`.

## Frontend Files Added/Changed

- Added `apps/web/src/features/courses/components/CourseSettingsPanel.tsx`.
- Added settings API methods and hooks:
  - `useCourseSettings(courseId)`
  - `useUpdateCourseSettings()`
  - `useArchiveCourse()`
  - `useRestoreCourse()`
  - `useDeleteCourse()`
- Added Settings tab on the course page, visible only when the shared permission object says the user is `ADMIN` or course `OWNER`.
- Extended course query keys and course settings TypeScript DTOs.

## Destructive Modal Behavior

- Archive uses a custom modal and requires typing `ARCHIVE`.
- Delete uses a custom modal and requires typing `DELETE`.
- Delete modal states that delete is currently a protected soft-delete/archive operation.
- Modal copy states that modules, assignments, submissions, and grades are preserved.

## Tests Added

- Added `CourseServiceTest` coverage for:
  - `ADMIN` can update any course settings.
  - `OWNER` can update own course settings.
  - Non-owner `TEACHER` receives forbidden.
  - `TA` receives forbidden.
  - `STUDENT` receives forbidden.
  - Inactive owner membership cannot manage the course.
  - Archive/delete requires owner or admin.
  - Delete soft-archives instead of hard-deleting.
  - Course code uniqueness validation.
- Updated endpoint contract tests for the new canonical course administration routes.

## Checks Run

- `npm run typecheck` in `apps/web`: passed.
- `npm run build` in `apps/web`: passed.
- `git diff --check`: passed, with existing line-ending warnings only.
- Local browser smoke: attempted `/courses` on `localhost:3000` and `127.0.0.1:3000`, but the in-app browser reported `ERR_BLOCKED_BY_CLIENT` before the page loaded.

Could not run:

- `mvn test -pl services/learning-service`: `mvn` is not installed and no `mvnw` wrapper exists in the repository.
- `pnpm tsc --noEmit` / `pnpm build`: `pnpm` is not installed; equivalent npm scripts were run instead.

## Production Smoke

Not run. No deployment was requested or performed, and destructive production testing should use an `E2E_TEST_` course only.

## Remaining TODOs

- Ownership transfer is not exposed by the current course settings model; leave as TODO until a canonical owner-transfer service and audit flow exist.
- If hard delete is ever required, implement it as a separate explicit admin-only operation with audit logging and dependency checks.
