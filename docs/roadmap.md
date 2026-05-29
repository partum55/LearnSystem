# Roadmap

## Near Term

- Production E2E for the CourseStatus archived model if not already completed.
- Full SpeedGrader AI E2E with a real submission.
- Gradebook Excel export.
- Syllabus page using `RichContentEditor`.
- Safe cleanup/admin cleanup for E2E artifacts.
- Gemini quota/rate-limit handling improvements.

## Medium Term

- Conditional access and action locks.
- Group-based assignment access.
- Manual attendance statuses.
- Rotating QR attendance sessions.
- Rubrics.
- Grade history.
- Server-side dashboard layout persistence.
- Notification preferences.

## Later

- AI student tutor after permissions/retrieval design.
- AI chat over selected course context.
- Course package import/export.
- Analytics dashboards.
- Audit log.

## Explicit Product Decisions

- Courses are private by design; access is membership/rules based.
- Course lifecycle uses `DRAFT`, `PUBLISHED`, and `ARCHIVED`.
- Archive is reversible; delete is hard delete.
- AI grading must remain teacher-reviewed; no auto-publish.
- Public course landing pages are not planned.
- Enrollment invitations are not planned.
- Form assignments remain development/verification-needed unless a production flow proves otherwise.
