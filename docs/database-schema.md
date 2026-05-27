# Database Schema

Supabase migrations in `supabase/migrations` define the canonical schema. The active model is centered on `public.users`, `learning.*`, and `ai.*`.

## Users

Implemented now:

- `public.users`
  - Canonical application user table.
  - Linked to Supabase Auth user ids.
  - Global roles: `ADMIN`, `TEACHER`, `USER`.
  - Stores profile fields, activity flags, locale/theme preferences, and timestamps.

Auth synchronization is handled from Supabase into `public.users`; backend JWT handling expects a local canonical user record.

## Learning

Implemented now:

- `learning.courses`
  - Course metadata, owner, status, visibility, term/date fields.
- `learning.course_members`
  - Per-course roles and active membership status.
  - Course roles: `OWNER`, `TEACHER`, `TA`, `STUDENT`.
- `learning.modules`
  - Ordered course sections with native status enum.
- `learning.learning_items`
  - Canonical learning material entries inside modules.
  - Supports structured `content_json`.
- `learning.lesson_pages`
  - Structured pages for learning items.
  - Page types include text, video, code, Mermaid, math, and inline quiz-style content.
- `learning.assignments`
  - Canonical assignments inside modules.
  - Uses `instructions_json` for rich instructions.
  - Supports draft/published/archive lifecycle.
- `learning.assignment_submissions`
  - Student submissions; service/domain code may refer to this as submissions.
  - Supports `content_json` for text submissions.
- `learning.submission_versions`
  - Submission version history when a submission is updated.
- `learning.grades`
  - Gradebook entries and publication state.
- `learning.enrollment_groups`
  - Admin-managed global groups.
- `learning.enrollment_group_members`
  - Membership of users in global enrollment groups.
- `learning.course_groups`
  - Links global groups to courses.
- `learning.seminar_attendance_sessions`
  - QR attendance sessions tied to seminar assignments.
- `learning.seminar_attendance_records`
  - Student check-in records.

## AI

Implemented now:

- `ai.user_api_keys`
  - User-owned provider keys.
  - Provider enum currently supports `GEMINI`.
  - Keys are encrypted at rest.
  - Raw keys are never returned by the API.
- `ai.ai_generations`
  - Generation history for canonical AI tasks.
  - Tracks user, task type, provider, model, status, request payload, response payload, and error code/message.

The system Gemini key is not stored in the database. It is read from `AI_SYSTEM_GEMINI_API_KEY` in service environment configuration.

## Native Enums

Implemented now:

- User/theme and course/learning domain columns use native Postgres enums where migrations have canonicalized closed value sets.
- Important enums include course status, course visibility, course role, course member status, module status, learning item type, lesson page type, assignment type/status, submission status, grade status, seminar attendance session/record status, and AI provider/key status.
- Draft statuses are first-class values for course content and assignment/grade workflows.

## Removed From The Active Model

The canonical schema uses modules, learning items, lesson pages, assignments, submissions, and grades as the active course content model.

## Partially Implemented / Needs Verification

- Form assignment submission endpoints exist, but form assignments remain in development and should be validated before being presented as complete product behavior.
- Analytics-oriented tables/dashboards should be treated as planned or verification-needed unless a specific production flow proves them.
