# Docs Refresh Report

Date: 2026-05-29

## Docs Updated

- `docs/database-schema.md`
- `docs/course-model.md`
- `docs/backend-services.md`
- `docs/ai-service.md`
- `docs/deployment.md`
- `docs/production-debugging.md`
- `docs/e2e-testing.md`
- `docs/roadmap.md`
- `docs-refresh-report.md`

## Table Names Verified

Verified against Supabase migrations and current JPA entities:

- `learning.courses`
- `learning.course_members`
- `learning.modules`
- `learning.learning_items`
- `learning.lesson_pages`
- `learning.assignments`
- `learning.assignment_submissions`
- `learning.submission_versions`
- `learning.grades`
- `learning.enrollment_groups`
- `learning.enrollment_group_members`
- `learning.course_groups`
- `learning.seminar_attendance_sessions`
- `learning.seminar_attendance_records`
- `ai.user_api_keys`
- `ai.ai_generations`

No active canonical `question_bank` table remains after the canonical cleanup migration.

## Schema Corrections Made

- Replaced stale submission references with canonical `learning.assignment_submissions`.
- Replaced stale gradebook table references with canonical `learning.grades`.
- Documented `assessment.submissions`, `grading.gradebook_entries`, `learning.submissions`, and `learning.gradebook_entries` as historical migration names only.
- Documented `learning.lesson_pages` as the replacement for old `learning.lesson_blocks`.
- Documented legacy topics/resources/question bank as removed from the active model.

## CourseStatus Model Documented

- Final lifecycle values: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- No `CourseVisibility`.
- No `PUBLIC` or `PRIVATE` course concept.
- No canonical course `is_published` boolean.
- Ownership is `course_members.role_in_course = OWNER`.
- Archived courses preserve stored roles and apply read-only effective permissions for teacher, TA, and student.

## AI Generation Documented

- Gemini BYOK and admin system key behavior.
- Encrypted user keys in `ai.user_api_keys`.
- Test connection endpoint.
- Canonical `POST /api/v1/ai/tasks`.
- Implemented task types.
- Structured output schemas and `AiOutputValidator`.
- `ai.ai_generations` history.
- Draft/review/no-auto-publish rules.
- Grade suggestion local-only behavior.
- Current rich-content block id adapter debt.

## Stale Docs Removed Or Relabeled

- Removed active-doc references to course visibility, public/private courses, `is_published` courses, and legacy content tables as current behavior.
- Corrected AI endpoints away from old `/api/ai` language for canonical workflows.
- Kept bulk enrollment endpoints using the implemented `/members/bulk/preview` and `/members/bulk/confirm` route shape.
- Replaced generic attendance wording with seminar attendance endpoint documentation.
- No additional files were archived this run; stale active docs were corrected in place.

## Remaining Verification TODOs

- Run production E2E for the archived CourseStatus model if not already completed.
- Run full SpeedGrader AI E2E against a real submission.
- Verify any older AI controllers before documenting them as product workflows.
- Verify form assignment production behavior before marking it complete.
