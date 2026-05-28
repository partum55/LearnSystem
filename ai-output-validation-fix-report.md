# AI Output Validation Fix Report

## Root Cause

Gemini was reached successfully, but the previous response schema was too loose for nested rich-content documents. Gemini could return empty nested objects such as `{}` for `contentJson`, `instructionsJson`, or `syllabusJson`. `AiOutputValidator` then rejected those responses with `AI_OUTPUT_INVALID`, most visibly as `RichContentDocument is required`.

Historical failed rows did not store provider output, so the exact old raw shape is unavailable for those failures:

- `GENERATE_RTE_MATERIAL`: `FAILED`, `output_json = null`, `error_message = RichContentDocument is required`
- `GENERATE_ASSIGNMENT`: `FAILED`, `output_json = null`, `error_message = RichContentDocument is required`

The AI service now stores sanitized provider output or validation diagnostics on validation failures, without API keys or hidden prompt text.

## Backend Changes

- Added strict but simple Gemini `responseJsonSchema` definitions for:
  - `GENERATE_RTE_MATERIAL`
  - `GENERATE_ASSIGNMENT`
  - `GENERATE_COURSE`
  - `SUGGEST_GRADE`
- Required canonical fields are now represented in schema:
  - rich content: `version: 1`, `type: "RICH_CONTENT"`, `blocks`
  - material: `title`, `contentJson`
  - assignment: `type: "TEXT_SUBMISSION"`, `title`, `points`, `instructionsJson`, `settings`
  - course: `course`, `modules`
- Prompt templates now explicitly require JSON only, exact field names, uppercase canonical enums, no markdown fences, and safe rich-content blocks only.
- Validator diagnostics now include safe field-path/type details and are stored in `ai_generations.error_message`.
- Added safe output normalization only for canonical cases: trim strings, uppercase known enums, default empty assignment settings, clamp positive points, and remove unsupported extra fields.
- Added AI validator fixture tests for valid/invalid RTE material, assignment, and course draft.

## Frontend Follow-Up

After backend generation was fixed, production browser testing found a separate frontend editor issue: Gemini returns canonical rich-content blocks without editor-only `block.id`, which the frontend `RichContentEditor` expects after accepting an AI draft.

Fix:

- Added `normalizeRichContentDocument()` for frontend editor flows.
- AI material and assignment accept paths now add editor block ids/defaults before rendering or storing editor content.
- Learning item detail parsing now normalizes persisted rich content before opening the editor.
- AI preview buttons now use `type="button"` so they do not accidentally submit enclosing forms.

## Verification

- `npm run typecheck` in `apps/web`: passed.
- `npm run build` in `apps/web`: passed.
- `mvn test -pl ai-service -am` via production Maven container: passed, 6 tests.
- Production health check: `https://api.learnsystem.app/api/v1/actuator/health` returned `{"status":"UP"}`.

Production headed browser results:

- `GENERATE_RTE_MATERIAL`: completed; preview rendered; accepted material created as `RTE HIDDEN`.
- AI material detail route opened successfully after frontend normalization.
- `GENERATE_ASSIGNMENT`: completed; preview rendered `TEXT_SUBMISSION`, `10 pts`; accepted into wizard without crash; created assignment as `DRAFT`.
- `GENERATE_COURSE`: completed; preview rendered; `from-draft` created course `Practical JavaScript Testing with TDD` as `DRAFT` / `DRAFT`.

DB confirmation:

- Latest `GENERATE_COURSE`, `GENERATE_ASSIGNMENT`, and `GENERATE_RTE_MATERIAL` rows are `COMPLETED`.
- Created AI course `0ac478b9-a330-42d4-a886-28ab9a047f14` has `status = DRAFT`, `visibility = DRAFT`.
- Created AI assignment `ee82a579-a01a-4cd0-b6f1-153f954a3f76` has `assignment_type = TEXT_SUBMISSION`, `status = DRAFT`, `max_points = 10`.

## Remaining Blockers

No remaining `AI_OUTPUT_INVALID` blocker was observed after the schema/prompt/validator fix. Browser automation text entry in the in-app browser still had clipboard issues, so prompt text was inserted manually during headed verification.
