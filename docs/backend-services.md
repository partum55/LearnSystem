# Backend Services

All public browser API calls should flow through the gateway under `/api/v1`. Backend services expose `/v1` routes internally.

## Gateway

Implemented now:

- Owns the public `/api/v1` prefix.
- Routes user, learning, AI, admin, and health traffic to service containers.
- Applies CORS/rate-limit/security configuration.
- Important public route families:
  - `/api/v1/courses/**`
  - `/api/v1/assignments/**`
  - `/api/v1/enrollment-groups/**`
  - `/api/v1/ai/**`
  - `/api/v1/users/me/ai-settings/**`
  - `/api/v1/admin/**`

Health check:

- `GET https://api.learnsystem.app/api/v1/actuator/health`

## user-service

Implemented now:

- Canonical user profile:
  - `GET /v1/users/me`
  - `PUT /v1/users/me`
- Admin users:
  - `GET /v1/admin/users`
  - `GET /v1/admin/users/{id}`
  - `PATCH /v1/admin/users/{id}`
- Internal user lookup:
  - `GET /internal/users/{id}`
  - `GET /internal/users/by-email`
  - `POST /internal/users/by-emails`

Responsibilities:

- Owns `public.users`.
- Maps Supabase-authenticated identities to canonical user records.
- Handles global platform roles: `ADMIN`, `TEACHER`, `USER`.

AI settings are owned by `ai-service`, not `user-service`.

## learning-service

Implemented now:

- Courses:
  - `GET /v1/courses/my-active`
  - `GET /v1/courses/my-teaching`
  - `POST /v1/courses`
  - `GET /v1/courses/{courseId}/overview`
  - `GET /v1/courses/{courseId}/modules`
  - `POST /v1/courses/from-draft`
- Admin courses:
  - `GET /v1/admin/courses`
  - `POST /v1/admin/courses`
  - `GET /v1/admin/courses/{courseId}`
  - `PATCH /v1/admin/courses/{courseId}`
  - `POST /v1/admin/courses/{courseId}/archive`
- Course members:
  - `GET /v1/courses/{courseId}/members`
  - `POST /v1/courses/{courseId}/members`
  - `PATCH /v1/courses/{courseId}/members/{userId}`
  - `DELETE /v1/courses/{courseId}/members/{userId}`
  - `POST /v1/courses/{courseId}/members/bulk/preview`
  - `POST /v1/courses/{courseId}/members/bulk/confirm`
- Modules:
  - `POST /v1/courses/{courseId}/modules`
  - `PATCH /v1/modules/{moduleId}`
  - `DELETE /v1/modules/{moduleId}`
- Learning items and pages:
  - `POST /v1/courses/{courseId}/modules/{moduleId}/learning-items`
  - `GET /v1/learning-items/{learningItemId}`
  - `PATCH /v1/learning-items/{learningItemId}`
  - `DELETE /v1/learning-items/{learningItemId}`
  - `GET /v1/learning-items/{learningItemId}/pages`
  - `POST /v1/learning-items/{learningItemId}/pages`
  - `PATCH /v1/learning-items/{learningItemId}/pages/{pageId}`
  - `DELETE /v1/learning-items/{learningItemId}/pages/{pageId}`
  - `PATCH /v1/learning-items/{learningItemId}/pages/reorder`
- Assignments and submissions:
  - `GET /v1/assignments/{assignmentId}`
  - `POST /v1/courses/{courseId}/modules/{moduleId}/assignments`
  - `PATCH /v1/assignments/{assignmentId}`
  - `DELETE /v1/assignments/{assignmentId}`
  - `POST /v1/assignments/{assignmentId}/submissions/file`
  - `POST /v1/assignments/{assignmentId}/submissions/text`
  - `POST /v1/assignments/{assignmentId}/submissions/form`
  - `POST /v1/assignments/{assignmentId}/submissions/vpl`
  - `GET /v1/assignments/{assignmentId}/submissions`
  - `GET /v1/submissions/{submissionId}/review`
  - `PATCH /v1/submissions/{submissionId}`
  - `DELETE /v1/submissions/{submissionId}`
  - `PATCH /v1/submissions/{submissionId}/grade-draft`
  - `POST /v1/submissions/{submissionId}/publish-grade`
- Gradebook:
  - `GET /v1/courses/{courseId}/gradebook`
  - `PATCH /v1/courses/{courseId}/gradebook/cells`
  - `POST /v1/courses/{courseId}/gradebook/publish`
  - `GET /v1/courses/{courseId}/gradebook/me`
- Enrollment groups:
  - `GET /v1/enrollment-groups`
  - `GET /v1/enrollment-groups/{groupId}`
  - `POST /v1/enrollment-groups`
  - `DELETE /v1/enrollment-groups/{groupId}`
  - `GET /v1/enrollment-groups/{groupId}/members`
  - `POST /v1/enrollment-groups/{groupId}/members`
  - `DELETE /v1/enrollment-groups/{groupId}/members/{userId}`
  - `GET /v1/courses/{courseId}/enrollment-groups`
  - `POST /v1/courses/{courseId}/enrollment-groups`
  - `DELETE /v1/courses/{courseId}/enrollment-groups/{groupId}`
- Seminar attendance:
  - `POST /v1/assignments/{assignmentId}/seminar-attendance/sessions`
  - `GET /v1/assignments/{assignmentId}/seminar-attendance`
  - `POST /v1/seminar-attendance/check-in`
  - `POST /v1/seminar-attendance/sessions/{sessionId}/close`
- Dashboard:
  - `GET /v1/dashboard/student`

## ai-service

Implemented now:

- AI settings/readiness:
  - `GET /v1/users/me/ai-settings`
  - `PUT /v1/users/me/ai-settings/api-key`
  - `DELETE /v1/users/me/ai-settings/api-key`
  - `POST /v1/users/me/ai-settings/api-key/validate`
- Canonical AI task endpoint:
  - `POST /v1/ai/tasks`
- Health/readiness:
  - `GET /v1/ai/health`
  - `GET /v1/ai/ready`
  - `GET /v1/ai/alive`

The canonical generation endpoint supports Gemini-backed tasks and records output in `ai.ai_generations`.

Partially implemented / needs verification:

- Older AI endpoints for templates, widgets, plugin generation, syllabus generation, and streaming course generation exist in code. They are not the canonical product path and should not be documented as primary workflows until reviewed.

## analytics-service

Partially implemented / needs verification:

- The service exists with analytics controllers and DTOs.
- Treat analytics dashboards as future roadmap until production behavior is verified.
