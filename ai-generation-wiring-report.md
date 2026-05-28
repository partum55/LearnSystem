# AI Generation Wiring Report

Date/time: 2026-05-28 Europe/Kiev

## Summary

Real AI task wiring is present for course generation, RTE material generation, assignment generation, and grade suggestions. This pass removed the remaining placeholder text hits from repository search results and tightened AI grade suggestion so Gemini receives real assignment/submission review context instead of only opaque IDs.

## Placeholder Search

Searched the repository for the old readiness-only phrases requested by the task:

- AI course generation placeholder text
- AI endpoint disabled placeholder text
- readiness-only pass phrasing
- old future-tense placeholder wording

Result: no remaining matches outside generated TypeScript build metadata, which was excluded from the text search.

## Frontend Wiring

- Create course with AI opens `/courses/ai-create`.
- `/courses/ai-create` calls `POST /api/v1/ai/tasks` through the canonical frontend `/v1/ai/tasks` client path with type `GENERATE_COURSE`.
- Generated course drafts are confirmed through `POST /api/v1/courses/from-draft`.
- Generate material with AI calls `GENERATE_RTE_MATERIAL`.
- Accepted generated material is created hidden/draft via the existing learning item creation flow.
- Generate assignment with AI calls `GENERATE_ASSIGNMENT`.
- Accepted generated assignments set `visible=false`, so teacher review/save is required before publishing.
- AI suggest grade calls `SUGGEST_GRADE`.
- Accepted grade suggestions only fill local score/comment fields in SpeedGrader; they do not auto-save or auto-publish.

## Backend Wiring

- Gateway route `/api/v1/ai/**` routes to ai-service.
- Gateway route `/api/v1/courses/**` covers `/api/v1/courses/from-draft`.
- `CourseDraftService.createFromDraft(...)` is transactional and enforces DRAFT course/module/assignment status plus hidden learning items.
- Added internal learning-service endpoint:
  - `GET /v1/internal/submissions/{submissionId}/ai-review-context?teacherId=...`
  - Protected by the existing internal token filter.
  - Reuses `CanonicalAssignmentService.reviewSubmission(...)`, so teacher access checks still apply.
- Updated `AiTaskHandler` to receive the authenticated `userId`.
- Updated `SuggestGradeHandler` to fetch real submission review context using the authenticated teacher/TA user ID before calling Gemini.
- No compatibility `/api/ai/**` route or fake task response was added.

## Verification

- `npm run typecheck` in `apps/web`: PASS.
- `npm run build` in `apps/web`: PASS.
- Placeholder search: PASS.

Backend tests could not run in this local workspace:

- `mvn test -pl ai-service -am`: BLOCKED, `mvn` is not installed.
- `mvn test -pl learning-service -am`: BLOCKED, `mvn` is not installed.
- Docker Maven fallback: BLOCKED, Docker daemon is not running.

## Production / E2E Status

Production deploy and fresh headed browser E2E were not completed from this workspace because the backend changes are local and not deployed. The requested full production flow still needs to be run after a successful backend deploy and frontend push:

- teacher opens Create course with AI
- generates course draft
- creates course from draft
- generates RTE material
- generates TEXT_SUBMISSION assignment
- student submits
- teacher requests AI grade suggestion
- teacher manually saves/publishes
- student sees grade

## Files Changed In This Pass

- `services/ai-service/src/main/java/com/university/lms/ai/service/AiTaskHandler.java`
- `services/ai-service/src/main/java/com/university/lms/ai/service/AiTaskService.java`
- `services/ai-service/src/main/java/com/university/lms/ai/service/LearningServiceClient.java`
- `services/ai-service/src/main/java/com/university/lms/ai/handler/GenerateCourseHandler.java`
- `services/ai-service/src/main/java/com/university/lms/ai/handler/GenerateRteMaterialHandler.java`
- `services/ai-service/src/main/java/com/university/lms/ai/handler/GenerateAssignmentHandler.java`
- `services/ai-service/src/main/java/com/university/lms/ai/handler/ImproveInstructionsHandler.java`
- `services/ai-service/src/main/java/com/university/lms/ai/handler/SuggestGradeHandler.java`
- `services/learning-service/src/main/java/com/university/lms/course/assignments/controller/CanonicalAssignmentController.java`
- `ai-implementation-code-audit-report.md`
- `docs/archive/2026-05-27-old-docs/ai-readiness-production-smoke-report.md`
