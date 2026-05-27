# LearnSystem Documentation

This documentation describes the current canonical LearnSystem architecture as of 2026-05-27. Historical notes and stale docs were archived under `docs/archive/2026-05-27-old-docs/` and are not part of the active system design.

## Current Docs

- [architecture.md](architecture.md) - system architecture and request flow.
- [database-schema.md](database-schema.md) - canonical Postgres/Supabase schemas and tables.
- [backend-services.md](backend-services.md) - service ownership and important endpoints.
- [frontend-architecture.md](frontend-architecture.md) - Next.js feature layout, routes, API clients, and UI direction.
- [course-model.md](course-model.md) - canonical course roles, course page UX, modules, and preview model.
- [rich-content-editor.md](rich-content-editor.md) - document canvas and structured rich content.
- [gradebook.md](gradebook.md) - course grade tab, full gradebook, SpeedGrader, and AI grading status.
- [course-people-enrollment.md](course-people-enrollment.md) - people management, CSV bulk enrollment, and groups.
- [qr-seminar-attendance.md](qr-seminar-attendance.md) - seminar-only QR attendance.
- [dashboard.md](dashboard.md) - role-based widget dashboard system.
- [ai-service.md](ai-service.md) - AI readiness, BYOK, Gemini tasks, and failure codes.
- [deployment.md](deployment.md) - production deployment flow and environment variables.
- [production-debugging.md](production-debugging.md) - clean production debugging workflow.
- [e2e-testing.md](e2e-testing.md) - production E2E strategy.
- [roadmap.md](roadmap.md) - near, medium, and later planned work.
- [../docs-refresh-report.md](../docs-refresh-report.md) - summary of this documentation reset.

## Status Language

- Implemented now: present in code and documented as current behavior.
- Partially implemented / needs verification: code or UI exists but should be validated in production before being treated as stable.
- Planned future work: design direction only; not documented as shipped behavior.

## Active Design Boundaries

- The canonical learning model is courses -> modules -> one vertical list of learning items and assignments.
- The frontend should call backend APIs through the gateway, not providers directly.
- AI output is teacher-reviewed; generation must not auto-publish courses, assignments, materials, or grades.
- No current docs should describe the legacy course content model as an active model.
