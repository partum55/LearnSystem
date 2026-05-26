# AI Implementation Code Audit Report

Date/time: 2026-05-27 02:30 Europe/Kiev

Commit verified/deployed: `7bb66ff` (`Persist AI generation JSON as jsonb`)

## Summary

Real AI generation is now wired through the frontend and backend instead of readiness placeholders. The production UI opens real AI forms/wizards, and authenticated teacher calls reach `POST /api/v1/ai/tasks`. Production is currently blocked from completing generation by Gemini provider rate limiting (`AI_PROVIDER_RATE_LIMITED`), not by placeholder code or missing routes.

## Placeholder Strings Found And Removed

- `AI course generation is coming next`
  - Removed from course/dashboard create flows and replaced with navigation to `/courses/ai-create`.
- `AI generation endpoints are not enabled in this readiness pass`
  - Removed from the AI request gate in `ai-service`; the gate no longer returns readiness-only `501` responses.
- `readiness pass`
  - Removed from real AI generation paths.
- `placeholder`
  - Remaining hits are ordinary input placeholders or unrelated empty states, not readiness blockers for AI generation.
- `NOT_IMPLEMENTED` / `AI generation is coming`
  - No remaining real-generation blocker path found after the changes.

## Backend Endpoints Verified/Added

- `POST /api/v1/ai/tasks`
  - Present through gateway and routed to ai-service.
  - Supports task types:
    - `GENERATE_COURSE`
    - `GENERATE_RTE_MATERIAL`
    - `GENERATE_ASSIGNMENT`
    - `IMPROVE_ASSIGNMENT_INSTRUCTIONS`
    - `SUGGEST_GRADE`
  - Uses Gemini REST provider with `AI_GEMINI_MODEL` defaulting to `gemini-2.5-flash`.
  - Uses structured JSON response configuration and output validation.
  - Persists generation attempts to `ai.ai_generations`.
  - Fix added: `AiGeneration` JSON fields now use Hibernate `SqlTypes.JSON` so PostgreSQL `jsonb` inserts work.
- `POST /api/v1/courses/from-draft`
  - Present through gateway and learning-service.
  - Authenticated production smoke returned validation `400` for an empty draft, proving the route is live and validating.
  - Code validates canonical uppercase enums, rejects legacy fields, requires RichContentDocument-shaped content, creates draft course/module/assignment records, and runs in a transactional service method.

## Frontend Components Fixed

- `apps/web/src/features/courses/components/CourseAiWizard.tsx`
  - Calls `GENERATE_COURSE`.
  - Previews editable generated course draft.
  - Confirms via `POST /v1/courses/from-draft`.
- `apps/web/src/features/courses/components/LearningItemFormModal.tsx`
  - Replaced readiness modal state with real AI panel.
  - Calls `GENERATE_RTE_MATERIAL`.
  - Previews RichContent output and confirms to draft/hidden learning item creation.
- `apps/web/src/features/courses/components/AssignmentWizard.tsx`
  - Calls `GENERATE_ASSIGNMENT`.
  - Calls `IMPROVE_ASSIGNMENT_INSTRUCTIONS`.
  - Keeps generated assignments draft/hidden until teacher save.
- `apps/web/src/features/gradebook/components/SpeedGrader.tsx`
  - Shows `AI suggest grade` when staff has a submission selected.
  - Calls `SUGGEST_GRADE`.
  - Apply fills local score/feedback draft fields only; it does not save or publish.
- `apps/web/src/features/ai/components/AiGenerationPreview.tsx`
  - Renders RichContentDocument previews and assignment/grade suggestion metadata instead of raw placeholder text.

## Gateway Routes Verified/Added

- Canonical route retained: `/api/v1/ai/**`.
- Canonical route retained: `/api/v1/courses/from-draft`.
- Existing production routes include assignment, enrollment group, and AI settings paths.
- Removed old compatibility route `/api/ai/**`; production smoke now returns `404` for `/api/ai/tasks`.
- Added/updated gateway route contract coverage for canonical AI routing and old route absence.

## Permission Checks Verified

- `GENERATE_COURSE`
  - Enforced in ai-service for global `ADMIN` or `TEACHER`.
- Course-scoped teacher tasks
  - Enforced in ai-service via internal learning-service course role lookup.
  - `GENERATE_RTE_MATERIAL`, `GENERATE_ASSIGNMENT`, and `IMPROVE_ASSIGNMENT_INSTRUCTIONS` allow course `OWNER`, `TEACHER`, or `ADMIN`.
  - `SUGGEST_GRADE` allows course `OWNER`, `TEACHER`, `TA`, or `ADMIN`.
- AI service no longer relies on Supabase token role alone.
  - Fix added: ai-service resolves canonical user role through user-service internal endpoint using the internal token.
- Student direct smoke:
  - `e2e_student@learnsystem.app` direct `GENERATE_COURSE` request returned `403`.

## Tests And Checks Run

- Frontend:
  - `npm run typecheck` in `apps/web`: passed.
  - `npm run build` in `apps/web`: passed.
  - `npm run test:contracts` in `apps/web`: not available; package has no matching script.
- Backend:
  - Local `mvn test` could not run because Maven and Maven wrapper are not available in the local Windows workspace.
  - Production Docker compile for `ai-service` succeeded with Maven during image build.
  - Dockerfiles currently build with `-DskipTests`; backend unit tests were not executed by the production build.
- Production:
  - `docker compose ... config`: ran during deploy validation; output not included here because it contains environment values.
  - `docker compose ... build --progress=plain ai-service`: succeeded.
  - `docker compose ... up -d --force-recreate ai-service gateway caddy`: succeeded.
  - `docker compose ... ps -a`: ai-service, gateway, learning-service, user-service, Redis, and Caddy healthy.
  - `curl -i https://api.learnsystem.app/api/v1/actuator/health`: `200`, `{"status":"UP"}`.

## Production Verification

- Teacher AI settings:
  - `aiEnabled=true`
  - `effectiveKeySource=USER_KEY`
  - `hasUserApiKey=true`
- `POST https://api.learnsystem.app/api/v1/courses/from-draft`
  - Authenticated teacher empty draft returned validation `400`: `Course draft must have a title and a code`.
- `POST https://api.learnsystem.app/api/v1/ai/tasks`
  - Authenticated teacher `GENERATE_COURSE` reached ai-service and returned:
    - `AI_PROVIDER_RATE_LIMITED`
    - `Gemini API rate limit exceeded`
  - This confirms route, auth, key resolution, task dispatch, and provider call path are active.
- `POST https://api.learnsystem.app/api/ai/tasks`
  - Returned `404`, confirming the old route is not active.
- Student direct AI task attempt:
  - Returned `403`.

## Browser Verification

- Teacher dashboard:
  - `Create course with AI` is visible.
  - No `AI course generation is coming next` placeholder.
- `/courses/ai-create`:
  - Real AI course wizard opens.
  - `Generate Curriculum` triggers the real request path.
  - Browser UI shows `AI Generation Failed` / `Request failed`; direct API identifies the underlying cause as Gemini rate limit.
- Course module material modal:
  - `Generate material with AI` opens a real prompt panel.
  - No readiness-pass placeholder.
  - Generate action reaches the real failure UI while provider is rate-limited.
- Assignment wizard:
  - `Generate with AI` opens a real `Generate Assignment` panel.
  - `Improve instructions with AI` is present.
  - No readiness-pass placeholder.
  - Generate action reaches the real failure UI while provider is rate-limited.
- SpeedGrader:
  - Code is wired for `AI suggest grade`.
  - Browser could not fully exercise it because the checked production courses had no gradebook assignment/submission rows available for selection.

## Remaining Blockers

- Gemini is currently rate-limiting the production key/user-key path, so full generated draft previews and confirm/create flows could not be completed in browser.
- The frontend currently collapses the provider rate limit into a generic `Request failed` message in the browser UI; the API returns the correct structured `AI_PROVIDER_RATE_LIMITED` code.
- SpeedGrader browser verification needs a production course with at least one assignment and one submission; the current checked courses did not expose a selectable submission.
- Backend tests were not run locally because Maven/Maven wrapper are unavailable, and production Docker builds skip tests.

## Files Changed

- `apps/web/src/features/ai/components/AiGenerationPreview.tsx`
- `apps/web/src/features/courses/components/CourseAiWizard.tsx`
- `apps/web/src/features/courses/components/LearningItemFormModal.tsx`
- `apps/web/src/features/courses/components/AssignmentWizard.tsx`
- `apps/web/src/features/gradebook/components/SpeedGrader.tsx`
- `services/ai-service/src/main/java/com/university/lms/ai/AiServiceApplication.java`
- `services/ai-service/src/main/java/com/university/lms/ai/domain/entity/AiGeneration.java`
- `services/ai-service/src/main/java/com/university/lms/ai/repository/AiGenerationRepository.java`
- `services/ai-service/src/main/java/com/university/lms/ai/security/JwtAuthenticationFilter.java`
- `services/ai-service/src/main/java/com/university/lms/ai/service/AiTaskService.java`
- `services/ai-service/src/main/java/com/university/lms/ai/service/LearningServiceClient.java`
- `services/ai-service/src/main/java/com/university/lms/ai/service/UserServiceClient.java`
- `services/gateway/src/main/resources/application.yml`
- `services/gateway/src/main/resources/application-docker.yml`
- `services/gateway/src/test/java/com/university/lms/gateway/GatewayRouteConfigurationTest.java`
- `services/learning-service/src/main/java/com/university/lms/learning/config/SecurityConfig.java`
- `services/learning-service/src/main/java/com/university/lms/learning/security/InternalTokenFilter.java`
- `services/learning-service/src/main/java/com/university/lms/course/controller/CourseDraftController.java`
- `services/learning-service/src/main/java/com/university/lms/course/controller/InternalCourseRoleController.java`
- `services/learning-service/src/main/java/com/university/lms/course/dto/CourseDraftDto.java`
- `services/learning-service/src/main/java/com/university/lms/course/service/CourseDraftService.java`
- `ai-implementation-code-audit-report.md`
