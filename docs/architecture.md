# Architecture

## Implemented Now

LearnSystem is a service-oriented LMS with a Next.js frontend, Spring Boot backend services, Supabase Auth/Postgres, and a Docker/Caddy production deployment.

Request flow:

```text
Browser -> apps/web -> Gateway /api/v1 -> backend service /v1 -> Supabase/Postgres
```

The gateway owns the public `/api/v1` API prefix. Services expose internal `/v1` routes and should not be called directly by the browser in production.

## Frontend

- Main app: `apps/web`.
- Framework: Next.js 16, React 19, TypeScript.
- Auth: Supabase browser/server helpers.
- Data fetching: TanStack Query and feature-local API clients.
- Rich content: Tiptap-based editor and renderer.
- AI UX: feature-gated UI that calls LearnSystem APIs; no frontend direct calls to Gemini or other AI providers.

## Backend Services

- `gateway`: API edge, route mapping, health/service status, CORS/rate limits.
- `user-service`: canonical `public.users`, profile endpoints, admin user endpoints, internal user lookup.
- `learning-service`: canonical courses, course members, modules, learning items, lesson pages, assignments, submissions, grades, enrollment groups, seminar attendance, dashboards.
- `ai-service`: AI readiness, encrypted user AI keys, Gemini-backed task execution, generation history.
- `analytics-service`: still present in the repo; validate current production usage before expanding docs around analytics features.
- `execution-service`: present for code execution support; not central to the current canonical docs.

## Data and Auth

Supabase provides authentication and Postgres. App data lives primarily in:

- `public` for canonical users.
- `learning` for course and assessment data.
- `ai` for AI provider keys and generation history.

Backend services validate Supabase JWTs and map them to canonical users.

## Production

Production backend services run with Docker Compose under `/opt/learnsystem`, behind Caddy. The frontend deploys separately after push. Caddy exposes the API host and routes requests to the gateway.

## Design Goals

- Canonical APIs and schema only.
- No compatibility layer as a design goal.
- No documentation of the legacy course content model as current behavior.
- One clean fix per root cause when debugging production.

## Partially Implemented / Needs Verification

- `analytics-service` exists and has endpoints, but current product docs should treat analytics dashboards as future-facing until verified in production.
- Some older AI controllers remain in `ai-service`; the canonical AI path is `/api/v1/ai/tasks`.
