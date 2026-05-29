# Course People and Enrollment

## Implemented Now

People management is part of Course -> Members/People.

Sections:

- Staff: `OWNER`, `TEACHER`, `TA`.
- Students: `STUDENT`.

Supported operations:

- Add an existing user by email.
- Update course member role where permitted.
- Remove a course member where permitted.
- CSV bulk enrollment with preview and confirm.

Canonical bulk endpoints:

- `POST /v1/courses/{courseId}/members/bulk/preview`
- `POST /v1/courses/{courseId}/members/bulk/confirm`

## Permissions

- `ADMIN`: platform override; can manage staff and students.
- `OWNER`: can manage staff and students.
- `TEACHER`: can manage students only.
- `TA`: cannot manage members.
- `STUDENT`: cannot manage members.

## Enrollment Groups

Implemented now:

- `learning.enrollment_groups`: global groups.
- `learning.enrollment_group_members`: global group members.
- `learning.course_groups`: links global groups to courses.

Global group endpoints:

- `GET /v1/enrollment-groups`
- `GET /v1/enrollment-groups/{groupId}`
- `POST /v1/enrollment-groups`
- `DELETE /v1/enrollment-groups/{groupId}`
- `GET /v1/enrollment-groups/{groupId}/members`
- `POST /v1/enrollment-groups/{groupId}/members`
- `DELETE /v1/enrollment-groups/{groupId}/members/{userId}`

Course group link endpoints:

- `GET /v1/courses/{courseId}/enrollment-groups`
- `POST /v1/courses/{courseId}/enrollment-groups`
- `DELETE /v1/courses/{courseId}/enrollment-groups/{groupId}`

Admin-only:

- Manage global enrollment groups.

Course staff:

- Link groups to courses according to course permissions.

## Explicit Non-Goals Now

- No invitations.
- No pending users.
- No creating users from CSV.
- Unlinking a course group does not unenroll students.
- Group membership does not auto-sync after linking.

## Planned

- Group-based assignment/module access rules using `course_groups`.
