# Database Schema

Supabase migrations in `supabase/migrations` are the source of truth. The active production model is `public.users`, `learning.*`, and `ai.*`.

## Users

- `public.users`
  - Canonical application user table linked to Supabase Auth user ids.
  - Stores global role (`ADMIN`, `TEACHER`, `USER`), profile fields, active/deleted flags, locale/theme, and timestamps.
  - Backend JWT handling expects a matching local user record.

## Learning

- `learning.courses`
  - Stores course metadata, syllabus, `owner_id`, term/date fields, thumbnail/theme settings, and lifecycle `status`.
  - Lifecycle values are only `DRAFT`, `PUBLISHED`, and `ARCHIVED`.
  - There is no canonical course visibility column, no `PUBLIC` / `PRIVATE` course concept, and no course `is_published` boolean.
  - Product design treats all courses as private. Access is controlled by `learning.course_members`, course roles, enrollment groups, and future access rules.
  - Canonical ownership is `learning.course_members.role_in_course = OWNER`. `owner_id` is retained as creator/audit metadata unless code explicitly uses owner lookup.
  - Deleting a course is a hard delete; course-owned child tables use JPA cascade or database `ON DELETE CASCADE` where migrations define it.
- `learning.course_members`
  - Stores per-course membership with `role_in_course` (`OWNER`, `TEACHER`, `TA`, `STUDENT`) and `status` (`ACTIVE`, `DROPPED`, `COMPLETED`).
  - One row per course/user. This is the access and ownership table for courses.
- `learning.modules`
  - Ordered course sections.
  - Lifecycle/status values are `DRAFT`, `PUBLISHED`, and `ARCHIVED`.
  - Belongs to `learning.courses`; course deletion removes modules through entity/database ownership.
- `learning.learning_items`
  - Canonical learning material entries inside modules.
  - Types include `PDF`, `LINK`, `VIDEO`, `FILE`, `RTE`, `LESSON`, and `PRESENTATION`.
  - Status values are `VISIBLE`, `HIDDEN`, and `ARCHIVED`; rich content lives in `content_json`.
  - Belongs to `learning.modules` with `ON DELETE CASCADE`.
- `learning.lesson_pages`
  - Structured pages for lesson learning items.
  - Replaced the old `learning.lesson_blocks` table.
  - Page types include `TEXT`, `VIDEO`, `CODE`, `MERMAID`, `MATH`, and `INLINE_QUIZ_QUESTION`.
  - Belongs to `learning.learning_items` with `ON DELETE CASCADE`.
- `learning.assignments`
  - Canonical assignments inside courses/modules.
  - Uses `assignment_type`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `instructions_json`, due/availability fields, and `settings`.
  - Legacy assignment columns and external-tool dual write fields were removed from the active model.
- `learning.assignment_submissions`
  - Canonical submission table.
  - Domain term: submissions.
  - Stores one submission per assignment/user, `status`, version counter, `content_json`, file/form/autograde payloads, draft/published grade fields, lateness, timestamps, and grader metadata.
  - Unique key is assignment plus user.
- `learning.submission_versions`
  - Submission version history for edits/resubmissions.
  - Tracks submission id, assignment id, user id, version number, `status`, `content_json`, submitted timestamp, and creation timestamp.
  - Belongs to `learning.assignment_submissions` with `ON DELETE CASCADE`.
- `learning.grades`
  - Canonical gradebook-entry table.
  - Domain term: grades / gradebook entries.
  - Stores course, student, optional assignment/submission links, draft grade fields, published grade fields, override fields, status, late/excused flags, notes, and timestamps.
  - Unique key is course plus student plus assignment.
- `learning.enrollment_groups`
  - Admin-managed global enrollment groups.
  - Stores group name and timestamps.
- `learning.enrollment_group_members`
  - Links users to enrollment groups.
  - `group_id` and `user_id` both cascade on delete.
- `learning.course_groups`
  - Links courses to enrollment groups.
  - `course_id` and `group_id` both cascade on delete.
- `learning.seminar_attendance_sessions`
  - QR attendance sessions tied to seminar assignments.
  - Status values are `ACTIVE`, `CLOSED`, and `EXPIRED`.
  - Belongs to `learning.assignments` with `ON DELETE CASCADE`.
- `learning.seminar_attendance_records`
  - Student QR check-in records.
  - Current status is `PRESENT`; current method is `QR`.
  - Unique key is session plus student. Session and assignment references cascade on delete.

## Removed Learning Tables

- No active canonical `question_bank` table exists after the canonical cleanup.
  - Initial migrations created `assessment.question_bank`.
  - `20260523085203_move_all_app_tables_to_learning.sql` moved it to `learning.question_bank`.
  - `20260523093410_canonical_learning_schema_final.sql` dropped `learning.question_bank` and `learning.question_bank_versions`.
  - `20260527154600_fix_course_cascade_deletes.sql` is defensive only; it skips if a legacy `learning.question_bank` table is absent.
- Legacy `topics`, `resources`, `lessons`, and `lesson_blocks` are removed from the active model. Use modules, learning items, lesson pages, assignments, submissions, and grades.

## AI

- `ai.user_api_keys`
  - User-owned provider keys for AI settings.
  - Provider enum currently supports `GEMINI`.
  - Keys are encrypted at rest; raw keys are never returned.
  - Active keys are unique per user/provider and revoke by status.
- `ai.ai_generations`
  - Canonical AI task history.
  - Stores user id, task type, status, input/output JSON, provider, model, key source, token usage, error message, and timestamps.

The admin/system Gemini key is not stored in the database. It is read from service environment configuration.

## Native Enums

Important native enum sets include course status, course role, course member status, module status, learning item type/status, lesson page type, assignment type/status, submission status, grade status, seminar attendance status/method, AI provider, and AI provider key status.

## Verification Notes

- `learning.assignment_submissions` is the canonical submissions table.
- `learning.grades` is the canonical grades / gradebook entries table.
- Historical names such as `assessment.submissions`, `grading.gradebook_entries`, `learning.submissions`, and `learning.gradebook_entries` are migration history, not current canonical table names.
