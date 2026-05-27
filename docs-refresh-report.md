# Docs Refresh Report

Date: 2026-05-27

## Docs Archived

Stale documentation was moved to:

- `docs/archive/2026-05-27-old-docs/`

Archived items include:

- Previous root-adjacent production AI smoke report.
- Previous top-level `docs/*.md` files.
- Previous `docs/superpowers` planning/spec files.
- Previous app/service/infra READMEs that described older or partial architecture.
- Previous nested archive notes.

## Docs Created

Fresh documentation set:

- `README.md`
- `docs/README.md`
- `docs/architecture.md`
- `docs/database-schema.md`
- `docs/backend-services.md`
- `docs/frontend-architecture.md`
- `docs/course-model.md`
- `docs/rich-content-editor.md`
- `docs/gradebook.md`
- `docs/course-people-enrollment.md`
- `docs/qr-seminar-attendance.md`
- `docs/dashboard.md`
- `docs/ai-service.md`
- `docs/deployment.md`
- `docs/production-debugging.md`
- `docs/e2e-testing.md`
- `docs/roadmap.md`
- `docs-refresh-report.md`

## Key Decisions Documented

- Canonical architecture is frontend -> gateway -> services -> Supabase/Postgres.
- Frontend must not call AI providers directly.
- Active learning model is courses, course members, modules, learning items, lesson pages, assignments, submissions, grades.
- Course module contents are one vertical list of materials and assignments.
- AI generation is teacher-reviewed and must not auto-publish.
- QR attendance is tied to seminar assignments only.
- Enrollment uses existing users only; no invitations, pending users, or CSV-created users.
- Dashboard layout persistence is localStorage now and backend-ready later.

## Future Roadmap Documented

The roadmap separates near-term, medium-term, and later work, including AI generation verification, Gemini connection testing, gradebook export, syllabus, course preview, conditional access, group visibility, manual attendance, rotating QR, rubrics, grade history, server-side dashboard layouts, analytics, audit log, course package export/import, and mobile polish.

## Intentionally Left Out

- Raw secrets, passwords, API keys, bearer tokens, cookies, and full environment files.
- Historical architecture details as active docs.
- Public course landing page plans.
- Enrollment invitations.
- Auto-published AI grading.
- Unverified older AI controllers as primary product workflows.

## Needs Screenshots Later

- Course detail tabs.
- Rich content editor.
- Course people CSV preview/confirm.
- QR seminar attendance session.
- Dashboard customization panel.
- Full gradebook and SpeedGrader.
- Profile -> AI Settings.
