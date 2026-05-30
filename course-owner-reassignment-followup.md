# Follow-up: Admin course owner reassignment

Status: **DONE** — implemented 2026-05-30.
Created: 2026-05-30. Source: LMS post-audit report, remaining-risks item.

## Implementation

Shipped as a thin, canonical feature (no new architecture):

- **Endpoint:** `POST /v1/admin/courses/{courseId}/reassign-owner` with body
  `{ "newOwnerId": "<uuid>" }`, guarded by `@PreAuthorize("hasRole('ADMIN')")` on
  `CanonicalAdminCourseController`.
- **Service:** `CourseOwnerService.reassignOwner(courseId, newOwnerId)`
  (`com.university.lms.course.courses.service`):
  - `CourseAccessService.requireAdmin()` — backend source of truth (new canonical helper);
  - loads the course (404 if missing);
  - validates the new owner exists and is eligible (global role `TEACHER` or `ADMIN`) via
    `UserProfileClient`;
  - demotes any other active `OWNER` membership to `TEACHER` (kept active — never deleted) so a
    single active `OWNER` remains;
  - upserts the new owner as the single active `OWNER` (promotes an existing member, else creates
    one with `addedBy` = acting admin);
  - sets `course.ownerId`; **status is left unchanged** (archived stays archived — no auto-publish);
  - performs **no** deletes of content/enrollments/submissions/grades.
- **Tests:** `CourseOwnerServiceTest` — admin promote+demote (single active owner, status preserved,
  no deletes), admin creates membership for a brand-new owner, non-admin rejected (403), missing
  course (404), non-existent new owner rejected, ineligible (STUDENT) new owner rejected.

The remainder of this document is retained for historical context.

---


## Problem

When a TEACHER account is deleted or deactivated, `CourseService.deleteUserData` now
**archives** the courses they owned instead of cascade-deleting them (safe-delete, shipped
2026-05-30, commit `874e6f3`). This preserves enrolled students' submissions, grades and
progress, but leaves those archived courses with an `owner_id` pointing at a removed/inactive
user. There is currently **no supported way to give an orphaned course a new owner**, so it
cannot be un-archived, re-published, or actively maintained again.

## Goal

Let an ADMIN reassign the OWNER of a course to another user, so orphaned/archived courses can
be recovered without ever destroying student data.

## Requirements / acceptance criteria

- Trigger: teacher account deleted or deactivated, leaving owned (now archived) courses.
- An ADMIN (only) can reassign a course's owner to another active user (TEACHER or ADMIN).
- Reassignment is non-destructive:
  - **Never** cascade-delete the course, its modules, enrollments, submissions or grades.
  - Existing enrollments, members, content, submissions and grades are untouched.
- The new owner becomes an active `CourseMember` with `CourseRole.OWNER`; the stale OWNER
  membership (if any) is demoted/removed, not allowed to linger as a second active OWNER.
- Course `owner_id` is updated to the new owner.
- Works while the course is ARCHIVED (the common case); after reassignment the new owner can
  restore/publish through the existing lifecycle endpoints.
- Authorization goes through the canonical path (`CourseAccessService`) — backend is source of
  truth; identity from JWT, not request params.

## Proposed implementation (thin, canonical — no new architecture)

1. **Endpoint** on the existing `CanonicalAdminCourseController` (`/v1/admin/courses`):
   `POST /v1/admin/courses/{courseId}/reassign-owner` with body `{ "newOwnerId": "<uuid>" }`,
   guarded by `@PreAuthorize("hasRole('ADMIN')")` (matches the other admin endpoints there).
2. **Service** method (e.g. `CanonicalCourseService.reassignOwner(courseId, newOwnerId, actingAdminId)`
   or a small `CourseService.reassignOwner`):
   - Load the course (404 if missing).
   - Validate `newOwnerId` is a real, active user (call user-service / internal role check) and is
     allowed to own (TEACHER or ADMIN global role).
   - Upsert a `CourseMember(course, newOwnerId, OWNER, ACTIVE)`; if the user is already a member,
     promote them to OWNER instead of creating a duplicate.
   - Demote or deactivate any prior active OWNER membership so there is a single active OWNER.
   - Set `course.ownerId = newOwnerId` and save.
   - No deletes of content/enrollments/submissions/grades.
3. **Tests** (controller/service level), before shipping:
   - admin can reassign owner of an archived orphaned course;
   - non-admin (teacher/student) is rejected;
   - reassign to a non-existent / ineligible user is rejected;
   - enrollments, submissions and grades are unchanged after reassignment;
   - exactly one active OWNER remains.

## Why deferred

Not required for the safety fix that shipped — archiving already prevents data loss. Adding the
reassignment flow is a net-new feature surface (endpoint + cross-service user validation + tests)
and should land as its own reviewed change rather than be bundled into the cleanup. No security
regression in the meantime: orphaned courses are archived (read-only for non-owners), not exposed.

## Related

- `services/learning-service/.../course/service/CourseService.java#deleteUserData` (archives owned courses)
- `services/learning-service/.../course/courses/controller/CanonicalAdminCourseController.java`
- `services/learning-service/.../course/common/security/CourseAccessService.java` (canonical access path)
