# Course Model

## Structure

The canonical course model is:

```text
Course -> Modules -> ordered contents
                  -> learning materials
                  -> assignments
```

Module contents are one ordered vertical list. Learning materials and assignments live together in module order.

## CourseStatus

`CourseStatus` has exactly three values:

- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

There is no `CourseVisibility` model. Courses do not have `PUBLIC` or `PRIVATE` visibility; all courses are private by product design.

## Access Model

- `ADMIN` sees all courses.
- Non-admin users see only courses where they have an active `learning.course_members` row.
- `STUDENT` sees `PUBLISHED` and `ARCHIVED` courses where enrolled/member.
- `STUDENT` does not see `DRAFT` courses.
- `OWNER`, `TEACHER`, and `TA` see `DRAFT`, `PUBLISHED`, and `ARCHIVED` courses where they are members.
- Canonical ownership is `role_in_course = OWNER`.
- Global `TEACHER` role can create courses, but it is not an owner fallback for lifecycle/settings permissions.

## Archived Permissions

Archiving does not physically change `role_in_course`. Stored roles remain `OWNER`, `TEACHER`, `TA`, and `STUDENT`; effective permissions depend on `course.status`.

- `ADMIN` keeps full admin permissions.
- `OWNER` keeps full owner permissions.
- `TEACHER` becomes a read-only viewer.
- `TA` becomes a read-only viewer.
- `STUDENT` remains a read-only viewer.

## Lifecycle

- Publish: `DRAFT -> PUBLISHED`
- Unpublish: `PUBLISHED -> DRAFT`
- Archive: `DRAFT/PUBLISHED -> ARCHIVED`
- Restore: `ARCHIVED -> DRAFT`
- Delete: hard delete

Archive is a lifecycle action. Delete is destructive.

## Courses Page

The Courses page has Active Courses and Archived Courses.

Active Courses:

- Admin: all `DRAFT` and `PUBLISHED` courses.
- Owner/Teacher/TA: member `DRAFT` and `PUBLISHED` courses.
- Student: member `PUBLISHED` courses.

Archived Courses:

- Admin: all `ARCHIVED` courses.
- Non-admin: member `ARCHIVED` courses.

Archived course banner:

- Owner/admin: can edit, restore, and delete.
- Teacher/TA/student: read-only.

## Course Roles

- `OWNER`: full course control, including lifecycle, settings, archive/restore, and hard delete.
- `TEACHER`: learning management and grading while active; read-only when archived.
- `TA`: operational/grading assistance while active; read-only when archived.
- `STUDENT`: learner-only access; no draft access; read-only when archived.
- `ADMIN`: platform override.

## Active Content Model

The active model uses modules, learning items, lesson pages, assignments, submissions, and grades.

Removed from the active course model:

- Course visibility / `PUBLIC` / `PRIVATE`.
- Course `is_published`.
- Legacy topics/resources.
- Legacy `lesson_blocks`.
- Any use of visibility as draft state.
