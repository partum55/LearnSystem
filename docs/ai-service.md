# AI Service

## A. Implemented AI Readiness

The canonical AI service is Gemini-first and supports BYOK user keys.

Implemented now:

- Provider: `GEMINI`.
- User API keys stored in `ai.user_api_keys`.
- Keys are encrypted at rest.
- Raw keys are never returned by APIs.
- Profile -> AI Settings UI.
- `TEACHER` and `STUDENT` users must use their own key.
- `ADMIN` can use their own key or the system Gemini key.
- System Gemini key comes only from environment: `AI_SYSTEM_GEMINI_API_KEY`.
- Encryption secret comes from environment: `AI_KEY_ENCRYPTION_SECRET`.
- AI features are feature-gated.
- Raw keys must not be logged.

Settings endpoints:

- `GET /v1/users/me/ai-settings`
- `PUT /v1/users/me/ai-settings/api-key`
- `DELETE /v1/users/me/ai-settings/api-key`
- `POST /v1/users/me/ai-settings/api-key/validate`

Gateway public paths use `/api/v1/...`.

## B. Real AI Generation

Implemented now:

- Canonical endpoint: `POST /v1/ai/tasks`.
- Public gateway path: `POST /api/v1/ai/tasks`.
- Gemini REST API provider client.
- Model configured by `AI_GEMINI_MODEL`.
- Generation history in `ai.ai_generations`.
- Structured JSON output validation.
- No auto-publish.
- Teacher review/confirm is required.
- Transactional course creation from AI draft:
  - `POST /v1/courses/from-draft`
  - Public gateway path: `POST /api/v1/courses/from-draft`

Implemented task types:

- `GENERATE_COURSE`
- `GENERATE_RTE_MATERIAL`
- `GENERATE_ASSIGNMENT`
- `IMPROVE_ASSIGNMENT_INSTRUCTIONS`
- `SUGGEST_GRADE`

Permission model:

- Course generation: teacher/admin-oriented.
- RTE material and assignment generation: course owner/teacher.
- Grade suggestion: owner/teacher/TA.

Required review rules:

- Generated courses are drafts until the teacher confirms creation.
- Generated materials and assignments must be reviewed before saving/publishing.
- AI grade suggestions never save or publish automatically.

## Error Codes

Implemented now:

- `AI_KEY_REQUIRED`
- `AI_FEATURES_DISABLED`
- `AI_PROVIDER_AUTH_FAILED`
- `AI_PROVIDER_RATE_LIMITED`
- `AI_PROVIDER_UNAVAILABLE`
- `AI_OUTPUT_INVALID`
- `AI_TASK_FAILED`

Additional implemented permission code:

- `AI_PERMISSION_DENIED`

## Partially Implemented / Needs Verification

Older AI controllers still exist for templates, widgets, plugins, syllabus generation, and streaming generation. They are not the canonical product path and should be reviewed before being exposed in user-facing documentation.

## Planned

- Gemini connection test button in Profile -> AI Settings.
- Expanded AI feedback suggestions.
- AI student tutor only after permission and retrieval design.
- AI chat over selected course context.
