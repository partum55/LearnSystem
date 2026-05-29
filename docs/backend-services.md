# Backend Services

Browser API calls go through the gateway under `/api/v1`. Backend services expose matching internal `/v1` routes.

## Gateway

Implemented now:

- Owns the public `/api/v1` prefix.
- Routes user, learning, AI, admin, and health traffic to service containers.
- Applies CORS, rate-limit, and security configuration.

Important public route families:

- `/api/v1/courses/**`
- `/api/v1/assignments/**`
- `/api/v1/enrollment-groups/**`
- `/api/v1/ai/**`
- `/api/v1/users/me/ai-settings/**`
- `/api/v1/admin/**`

Health check:

```powershell
curl -i https://api.learnsystem.app/api/v1/actuator/health
```

## user-service

Implemented now:

- `GET /api/v1/users/me`
- `PUT /api/v1/users/me`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/{id}`
- `PATCH /api/v1/admin/users/{id}`

Internal lookups:

- `GET /internal/users/{id}`
- `GET /internal/users/by-email`
- `POST /internal/users/by-emails`

Responsibilities:

- Owns `public.users`.
- Maps Supabase-authenticated identities to canonical user records.
- Handles global platform roles: `ADMIN`, `TEACHER`, `USER`.

AI settings are owned by `ai-service`, not `user-service`.

## learning-service

Course list/detail/lifecycle:

- `GET /api/v1/courses`
- `GET /api/v1/courses?status=ARCHIVED`
- `GET /api/v1/courses/{courseId}`
- `GET /api/v1/courses/{courseId}/overview`
- `GET /api/v1/courses/{courseId}/modules`
- `GET /api/v1/courses/{courseId}/gradebook/me`
- `GET /api/v1/courses/{courseId}/settings`
- `PATCH /api/v1/courses/{courseId}/settings`
- `POST /api/v1/courses/{courseId}/publish`
- `POST /api/v1/courses/{courseId}/unpublish`
- `POST /api/v1/courses/{courseId}/archive`
- `POST /api/v1/courses/{courseId}/restore`
- `DELETE /api/v1/courses/{courseId}`
- `POST /api/v1/courses/from-draft`

Notes:

- Delete is a hard delete.
- Archive is a separate lifecycle action.
- Lifecycle/settings require `OWNER` or `ADMIN`.
- Global `TEACHER` is not an owner fallback.

Course creation and legacy list helpers:

- `POST /api/v1/courses`
- `GET /api/v1/courses/my-active`
- `GET /api/v1/courses/my-teaching`

Course members:

- `GET /api/v1/courses/{courseId}/members`
- `POST /api/v1/courses/{courseId}/members`
- `PATCH /api/v1/courses/{courseId}/members/{userId}`
- `DELETE /api/v1/courses/{courseId}/members/{userId}`
- `POST /api/v1/courses/{courseId}/members/bulk/preview`
- `POST /api/v1/courses/{courseId}/members/bulk/confirm`

Modules:

- `POST /api/v1/courses/{courseId}/modules`
- `PATCH /api/v1/modules/{moduleId}`
- `DELETE /api/v1/modules/{moduleId}`

Learning items and pages:

- `POST /api/v1/courses/{courseId}/modules/{moduleId}/learning-items`
- `GET /api/v1/learning-items/{learningItemId}`
- `PATCH /api/v1/learning-items/{learningItemId}`
- `DELETE /api/v1/learning-items/{learningItemId}`
- `GET /api/v1/learning-items/{learningItemId}/pages`
- `POST /api/v1/learning-items/{learningItemId}/pages`
- `PATCH /api/v1/learning-items/{learningItemId}/pages/{pageId}`
- `DELETE /api/v1/learning-items/{learningItemId}/pages/{pageId}`
- `PATCH /api/v1/learning-items/{learningItemId}/pages/reorder`

Assignments and submissions:

- `GET /api/v1/assignments/{assignmentId}`
- `POST /api/v1/courses/{courseId}/modules/{moduleId}/assignments`
- `PATCH /api/v1/assignments/{assignmentId}`
- `DELETE /api/v1/assignments/{assignmentId}`
- `POST /api/v1/assignments/{assignmentId}/submissions/file`
- `POST /api/v1/assignments/{assignmentId}/submissions/text`
- `POST /api/v1/assignments/{assignmentId}/submissions/form`
- `POST /api/v1/assignments/{assignmentId}/submissions/vpl`
- `GET /api/v1/assignments/{assignmentId}/submissions`
- `GET /api/v1/submissions/{submissionId}/review`
- `PATCH /api/v1/submissions/{submissionId}`
- `DELETE /api/v1/submissions/{submissionId}`
- `PATCH /api/v1/submissions/{submissionId}/grade-draft`
- `POST /api/v1/submissions/{submissionId}/publish-grade`

Gradebook:

- `GET /api/v1/courses/{courseId}/gradebook`
- `PATCH /api/v1/courses/{courseId}/gradebook/cells`
- `POST /api/v1/courses/{courseId}/gradebook/publish`
- `GET /api/v1/courses/{courseId}/gradebook/me`

Enrollment groups:

- `GET /api/v1/enrollment-groups`
- `GET /api/v1/enrollment-groups/{groupId}`
- `POST /api/v1/enrollment-groups`
- `DELETE /api/v1/enrollment-groups/{groupId}`
- `GET /api/v1/enrollment-groups/{groupId}/members`
- `POST /api/v1/enrollment-groups/{groupId}/members`
- `DELETE /api/v1/enrollment-groups/{groupId}/members/{userId}`
- `GET /api/v1/courses/{courseId}/enrollment-groups`
- `POST /api/v1/courses/{courseId}/enrollment-groups`
- `DELETE /api/v1/courses/{courseId}/enrollment-groups/{groupId}`

Seminar attendance:

- `POST /api/v1/assignments/{assignmentId}/seminar-attendance/sessions`
- `GET /api/v1/assignments/{assignmentId}/seminar-attendance`
- `POST /api/v1/seminar-attendance/check-in`
- `POST /api/v1/seminar-attendance/sessions/{sessionId}/close`

Dashboard:

- `GET /api/v1/dashboard/student`

## ai-service

AI settings:

- `GET /api/v1/users/me/ai-settings`
- `PUT /api/v1/users/me/ai-settings/api-key`
- `DELETE /api/v1/users/me/ai-settings/api-key`
- `POST /api/v1/users/me/ai-settings/api-key/validate`
- `POST /api/v1/users/me/ai-settings/test-connection`

Canonical AI task endpoint:

- `POST /api/v1/ai/tasks`

Implemented AI behavior:

- Gemini provider.
- BYOK user provider keys in `ai.user_api_keys`.
- Admin system key fallback from environment.
- Structured JSON output through Gemini response schemas.
- Validation through `AiOutputValidator`.
- Generation history in `ai.ai_generations`.
- No frontend direct Gemini calls.

Implemented task types:

- `GENERATE_COURSE`
- `GENERATE_RTE_MATERIAL`
- `GENERATE_ASSIGNMENT`
- `IMPROVE_ASSIGNMENT_INSTRUCTIONS`
- `SUGGEST_GRADE`

Older AI controllers for templates, widgets, plugins, syllabus generation, and streaming generation still exist in code. They are not the canonical product path until reviewed.

## analytics-service

The service exists with analytics controllers and DTOs. Treat analytics dashboards as future roadmap until production behavior is verified.
