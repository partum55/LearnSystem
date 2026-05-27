# LearnSystem

LearnSystem is a course management platform for university-style learning workflows: courses, modules, rich learning material, assignments, submissions, grading, enrollment, seminar QR attendance, dashboards, and teacher-reviewed AI assistance.

The current system is built around a canonical course model. It does not document or depend on the older content architecture.

## Tech Stack

- Frontend: Next.js app in `apps/web`, React, TypeScript, TanStack Query, Supabase auth helpers, Tiptap rich content editing.
- Backend: Spring Boot services under `services/`.
- API edge: Spring Cloud Gateway service.
- Data/auth: Supabase Auth plus Postgres schemas managed by `supabase/migrations`.
- Production: Docker Compose services behind Caddy, with frontend deployment handled separately after push.
- AI: `ai-service` with Gemini-first provider support, encrypted BYOK user keys, and teacher-reviewed generation workflows.

## Repo Layout

- `apps/web` - main Next.js application.
- `services/gateway` - API gateway and route aggregation.
- `services/user-service` - canonical users/profile/admin user APIs.
- `services/learning-service` - courses, modules, learning items, assignments, submissions, gradebook, enrollment groups, seminar attendance.
- `services/ai-service` - AI readiness, user AI settings, Gemini-backed task execution, generation history.
- `services/analytics-service` - analytics service still present in the repo.
- `services/execution-service` - code execution support service.
- `supabase/migrations` - database schema history.
- `infra/docker` - local and production Docker Compose files.
- `docs` - current documentation set.

## Local Development

Backend stack:

```powershell
docker compose -f infra/docker/docker-compose.yml up -d
```

Frontend:

```powershell
cd apps/web
npm install
npm run dev
```

The frontend calls the gateway through the configured API base. Auth is based on Supabase sessions, and API requests carry the Supabase bearer token through the gateway to backend services.

## Build and Test

Frontend:

```powershell
cd apps/web
npm run lint
npm run typecheck
npm run build
```

Backend:

```powershell
cd services
mvn test
mvn package
```

## Documentation

Start with [docs/README.md](docs/README.md). Key docs:

- [Architecture](docs/architecture.md)
- [Database Schema](docs/database-schema.md)
- [Backend Services](docs/backend-services.md)
- [Frontend Architecture](docs/frontend-architecture.md)
- [AI Service](docs/ai-service.md)
- [Deployment](docs/deployment.md)
- [Roadmap](docs/roadmap.md)
