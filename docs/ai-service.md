# AI Service

## Implemented Now

The canonical AI service is Gemini-first and supports user-owned provider keys.

- Provider: `GEMINI`.
- User API keys are stored in `ai.user_api_keys`.
- User keys are encrypted at rest.
- Raw keys are never returned by APIs.
- Admins may use the system Gemini key from environment when they do not have a user key.
- Teachers and students must use their own key.
- Test connection is implemented.
- Canonical generation endpoint is `POST /api/v1/ai/tasks`.
- Generation history is stored in `ai.ai_generations`.
- Frontend does not call Gemini directly.

Settings endpoints:

- `GET /api/v1/users/me/ai-settings`
- `PUT /api/v1/users/me/ai-settings/api-key`
- `DELETE /api/v1/users/me/ai-settings/api-key`
- `POST /api/v1/users/me/ai-settings/api-key/validate`
- `POST /api/v1/users/me/ai-settings/test-connection`

Required environment:

- `AI_FEATURES_ENABLED`
- `AI_DEFAULT_PROVIDER`
- `AI_GEMINI_MODEL`
- `AI_SYSTEM_GEMINI_API_KEY`
- `AI_KEY_ENCRYPTION_SECRET`

Do not log raw keys, bearer tokens, cookies, or full env files.

## Canonical Tasks

`POST /api/v1/ai/tasks` supports:

- `GENERATE_COURSE`
- `GENERATE_RTE_MATERIAL`
- `GENERATE_ASSIGNMENT`
- `IMPROVE_ASSIGNMENT_INSTRUCTIONS`
- `SUGGEST_GRADE`

The service uses Gemini structured JSON response schemas and validates output with `AiOutputValidator`. Rich content outputs must be structured `RichContentDocument` JSON, not markdown or legacy text blobs.

## Review And Publish Rules

- AI-generated courses are draft until reviewed and explicitly created through `POST /api/v1/courses/from-draft`.
- Generated course modules/materials/assignments are saved as draft/hidden content until reviewed.
- Generated materials and assignments must be reviewed before saving or publishing.
- AI suggested grades only fill local UI fields. They do not save, publish, or release a grade.
- Teachers must manually save draft grades and publish grades.

## Permissions

- `GENERATE_COURSE`: global `TEACHER` or `ADMIN`.
- `GENERATE_RTE_MATERIAL`: course `OWNER` or `TEACHER`.
- `GENERATE_ASSIGNMENT`: course `OWNER` or `TEACHER`.
- `IMPROVE_ASSIGNMENT_INSTRUCTIONS`: course `OWNER` or `TEACHER`.
- `SUGGEST_GRADE`: course `OWNER`, `TEACHER`, or `TA`.

## Error UX

Implemented provider/task error codes include:

- `AI_KEY_REQUIRED`
- `AI_FEATURES_DISABLED`
- `AI_PROVIDER_AUTH_FAILED`
- `AI_PROVIDER_RATE_LIMITED`
- `AI_PROVIDER_UNAVAILABLE`
- `AI_OUTPUT_INVALID`
- `AI_TASK_FAILED`
- `AI_PERMISSION_DENIED`

The UI should show provider errors as actionable states, especially missing key, invalid key, quota/rate limit, provider unavailable, and invalid output.

## Technical Debt

- The frontend editor requires stable rich-content block ids.
- Current handling uses the `normalizeRichContentDocument` adapter in `apps/web/src/features/rich-content/normalizeRichContent.ts`.
- This adapter should remain the compatibility boundary until backend and AI schemas consistently emit block ids.

## Not Canonical

Older AI controllers still exist for templates, widgets, plugins, syllabus generation, and streaming generation. They are not the primary product workflow until separately audited.
