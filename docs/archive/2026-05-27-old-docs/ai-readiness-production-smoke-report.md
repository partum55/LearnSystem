# AI Readiness Production Smoke Report

Date/time: 2026-05-26 15:40 Europe/Kiev  
Latest git commit: `74d7939 Align AI material and gradebook actions`  
App URL: https://app.learnsystem.app  
API URL: https://api.learnsystem.app

## Test Users

- ADMIN: `e2e_admin@learnsystem.app`, password masked
- TEACHER: `e2e_teacher@learnsystem.app`, password masked
- STUDENT: `e2e_student@learnsystem.app`, password masked

## Env Presence

- `AI_FEATURES_ENABLED`: SET, len=4
- `AI_DEFAULT_PROVIDER`: SET, len=6
- `AI_SYSTEM_GEMINI_API_KEY`: SET, masked
- `AI_KEY_ENCRYPTION_SECRET`: SET, masked
- `SUPABASE_URL`: SET, masked
- `SUPABASE_JWKS_URL`: SET, masked
- `USER_SERVICE_URL`: SET, masked
- `LEARNING_SERVICE_URL`: SET, masked

No raw secrets or API keys were printed.

## Deployment Commands Run

- `git status`
- `git log --oneline -5`
- `git pull`
- masked env presence check
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml config`
- Supabase migration applied with Dockerized `psql`
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml build --progress=plain`
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml up -d --force-recreate`
- `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml ps -a`
- `curl -i https://api.learnsystem.app/api/v1/actuator/health`

## Docker / Health Status

Final status:

- `lms-user-service`: healthy
- `lms-learning-service`: healthy
- `lms-ai-service`: healthy
- `lms-gateway`: healthy
- `lms-caddy`: running
- API health: `HTTP 200`, body `{"status":"UP"}`

## Fixes Made

- Added `ai-service` to production compose and wired AI env vars.
- Updated the AI migration to reset the old placeholder `ai.user_api_keys` table before creating the canonical table.
- Limited `ai-service` runtime scanning to the AI readiness slice so legacy generation entities do not block startup.
- Moved canonical `UserApiKey` entity into its own package so Hibernate validates only `ai.user_api_keys`.
- Simplified AI health endpoint to readiness health only, with no provider calls.
- Added the missing material-generation AI entry point to the learning material modal.
- Aligned grade action labels to:
  - `Open assignment`
  - `Open full gradebook filtered`
  - `Open SpeedGrader`

## Checks Passed

- `npm run typecheck`: PASS
- `npm run build`: PASS
- Production Docker/Maven build for `ai-service`: PASS
- Dockerized production-host `mvn test -pl ai-service -am -B`: PASS, no tests to run
- API health check: PASS

## ADMIN Flow

Result: PASS

- Dashboard loaded.
- Profile AI Settings loaded.
- Provider shown as Gemini.
- Admin with no personal key showed system Gemini key availability.
- No raw system key was shown.
- `Create course with AI` was visible.
- With system key, gate unlocked and showed the old AI course placeholder.
- No fake course generation occurred.
- Admin Users/Courses/Groups dashboard tabs did not crash.

## TEACHER Flow

Result: PASS

- Dashboard loaded.
- Profile AI Settings loaded.
- No-key state shown.
- System key was not exposed to teacher.
- `Create course with AI` visible.
- Without personal key, AI gate showed key-required state and `Go to AI Settings`.
- `Go to AI Settings` navigated to `Profile#ai-settings`.
- `Generate material with AI` now appears in the material modal and shows key-required state.
- Assignment wizard `Generate with AI` shows key-required state.
- SpeedGrader `AI suggest grade` shows key-required state.

No test Gemini key was provided, so user-key save/refresh/delete smoke was not exercised.

## STUDENT Flow

Result: PASS

- Dashboard loaded.
- Profile AI Settings loaded.
- No-key state shown.
- System key was not exposed to student.
- Course Grades tab stayed inline and did not redirect.
- Student saw only student grade view.
- Student did not see teacher Gradebook Summary.
- Student did not see full gradebook / SpeedGrader actions.

## AI Settings Behavior

- Admin fallback to `SYSTEM_KEY`: PASS.
- Teacher/student restriction from system key: PASS.
- Raw key exposure check: PASS.
- Settings page configuration display: PASS.
- Personal key save/delete: NOT TESTED, no test Gemini key provided.

## Course UI Cleanup

Result: PASS

- Course header no longer shows the old black Instructor/Modules/Progress cards.
- Progress is a thin minimal bar.
- Global staff tools bar is not present.
- Modules tab has `Create Module`.
- Module-level `Add learning material` and `Add assignment` are inside the module.
- Module contents render materials and assignments in one vertical list.

## Gradebook Tab Behavior

Result: PASS

- Teacher Grades tab did not redirect immediately.
- Inline `Gradebook Summary` rendered.
- Assignment action menu includes:
  - `Open assignment`
  - `Open full gradebook filtered`
  - `Open SpeedGrader`
- Explicit full gradebook filtered route worked.
- SpeedGrader route worked.
- Student Grades tab rendered inline student grades only.

## Console / Network / Logs

- Browser console errors captured from current tab: none.
- Caddy logs showed expected `403` responses for student calls to `/api/v1/courses/{courseId}/members?size=100`; UI did not crash and student-only grade view rendered correctly.
- AI service startup logs show JPA repository scan reduced to one repository and service started successfully.
- Gateway, user-service, learning-service, and caddy logs showed no blocker after final redeploy.

## Evidence Artifacts

Screenshot capture through the in-app browser timed out with `Page.captureScreenshot`; text and DOM evidence were captured instead.

Artifact directory:

`C:\Users\partu\OneDrive\Desktop\LearnSystemUCU\smoke-artifacts\ai-readiness-prod-2026-05-26T12-22-07-858Z`

Key artifact files:

- `admin-ai-settings.txt`
- `admin-ai-course-placeholder.txt`
- `admin-users-tab.txt`
- `admin-courses-tab.txt`
- `admin-groups-tab.txt`
- `teacher-ai-settings.txt`
- `teacher-ai-course-gate.txt`
- `teacher-course-overview.txt`
- `teacher-course-modules.txt`
- `teacher-assignment-ai-gate.txt`
- `teacher-speedgrader-ai-gate.txt`
- `retest-teacher-material-ai-gate.txt`
- `retest-teacher-grading-actions.txt`
- `student-ai-settings.txt`
- `student-course-grades-tab.txt`
- `browser-console-errors-current.json`

## Files Changed

- `infra/docker/docker-compose.prod.yml`
- `supabase/migrations/20260526090000_canonical_ai_user_api_keys.sql`
- `services/ai-service/src/main/java/com/university/lms/ai/AiServiceApplication.java`
- `services/ai-service/src/main/java/com/university/lms/ai/web/AIHealthController.java`
- `services/ai-service/src/main/java/com/university/lms/ai/domain/key/UserApiKey.java`
- `services/ai-service/src/main/java/com/university/lms/ai/domain/entity/UserApiKey.java`
- `services/ai-service/src/main/java/com/university/lms/ai/repository/UserApiKeyRepository.java`
- `services/ai-service/src/main/java/com/university/lms/ai/service/UserAiProviderKeyService.java`
- `services/ai-service/src/main/java/com/university/lms/ai/service/UserAiSettingsService.java`
- `apps/web/src/features/courses/components/LearningItemFormModal.tsx`
- `apps/web/src/features/gradebook/components/GradebookAssignmentActions.tsx`

## Remaining Blockers

- No remaining blocker for AI readiness smoke.
- Personal Gemini key save/replace/delete should be smoke-tested when a safe test Gemini key is available.
- Actual AI course/material/assignment/grade generation remains intentionally unimplemented.

## Cleanup Status

- No database volumes were removed.
- No raw secrets were printed.
- No user AI keys were created or deleted during smoke.
- Production is running latest code at `74d7939`.
