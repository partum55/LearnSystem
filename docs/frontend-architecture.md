# Frontend Architecture

## Implemented Now

The frontend lives in `apps/web` and uses a feature-sliced structure around product domains.

Key folders:

- `src/app` - Next.js routes.
- `src/features/admin` - admin API/hooks.
- `src/features/ai` - AI task hooks, feature gates, AI create course flow.
- `src/features/assignments` - assignment detail, submission, seminar attendance UI.
- `src/features/courses` - course list/detail, modules, people, AI course wizard, assignment wizard.
- `src/features/dashboard` - role-based dashboard grid and widget registry.
- `src/features/gradebook` - student grades, teacher gradebook, SpeedGrader.
- `src/features/learning-items` - learning item detail UI.
- `src/features/rich-content` - editor, renderer, markdown parser, Mermaid/math rendering.
- `src/features/users` - profile and AI settings.
- `src/api` - shared API client and query client.
- `src/lib/supabase` - Supabase browser/server helpers.
- `src/components` - shell and shared primitives.

## Routes

Implemented now:

- `/dashboard`
- `/today`
- `/courses`
- `/courses/ai-create`
- `/courses/{id}`
- `/courses/{id}/assignment-wizard`
- `/courses/{id}/gradebook`
- `/assignments`
- `/assignments/{id}`
- `/learning-items/{id}`
- `/profile`
- `/seminars/check-in?token=...`
- `/teacher/todo`
- Auth routes for login, register, password reset, verification, and callbacks.

Quiz attempt routes exist, but form/quiz workflows remain in development and should be verified before being treated as complete.

## API Clients and Hooks

Feature folders own their API modules and React Query hooks. API calls should use the shared client and canonical gateway paths. The frontend should not call Gemini or any AI provider directly.

Canonical examples:

- AI tasks: `/v1/ai/tasks`
- Course from AI draft: `/v1/courses/from-draft`
- Bulk member preview: `/v1/courses/{courseId}/members/bulk/preview`
- Bulk member confirm: `/v1/courses/{courseId}/members/bulk/confirm`

## Role-Based Rendering

Rendering is based on global role plus course role:

- Global roles: `ADMIN`, `TEACHER`, `USER`.
- Course roles: `OWNER`, `TEACHER`, `TA`, `STUDENT`.

Admins can override platform/course views where backend permissions allow it. Course staff controls are shown only when the user has the correct course role.

## UI Direction

The app is moving toward an Obsidian-inspired operational UI: quiet, dense, document-centered, and built for repeated course management work.

Current direction:

- No AI-gradient/default demo UI.
- No public course landing page.
- No global staff tools bar on course pages.
- Course pages should emphasize content, members, and grading in place.

## Course Detail Structure

Implemented now / active target structure:

- `CourseHeader`
- `ModulesPanel`
- `GradesPanel`
- `MembersPanel`
- supporting assignment, learning item, member, and group components.

The course page is tabbed:

- Overview
- Modules
- Grades
- Members

## Dashboard Grid

Implemented now:

- Role-specific dashboard pages.
- Widget registry and per-role default layouts.
- Drag reorder and predefined widget sizes.
- Current persistence is browser `localStorage`.

Planned:

- Server-side `layout_json` persistence.
