# MVP Runtime Guide

> Local development runtime for LearnSystem MVP — backend Docker stack + Supabase + Next.js frontend on host.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  HOST                                               │
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │ apps/web (Next)  │  │ Supabase CLI (local)     │ │
│  │ localhost:3000   │  │ DB:   localhost:54322     │ │
│  │ npm run dev      │  │ Auth: localhost:54321     │ │
│  └────────┬────────┘  │ Studio: localhost:54323   │ │
│           │            └──────────┬───────────────┘ │
│  ┌────────▼──────────────────────▼───────────────┐  │
│  │        Docker compose (learnsystem-mvp)        │  │
│  │  ┌─────────┐ ┌──────────────┐ ┌────────────┐  │  │
│  │  │  redis  │ │ user-service │ │ learning-  │  │  │
│  │  │  :6380  │ │   :8081      │ │ service    │  │  │
│  │  └─────────┘ └──────────────┘ │ :8089      │  │  │
│  │                               └────────────┘  │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │  gateway  :8080  (public entry point)    │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**MVP includes:** redis · user-service · learning-service · gateway  
**Excluded (not required for login + core LMS):** ai-service · analytics-service · execution-service · caddy

---

## Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Docker + Compose | v24+ | https://docs.docker.com/get-docker/ |
| Supabase CLI | v2.98+ | `brew install supabase/tap/supabase` or via package manager |
| Node.js + pnpm | Node 20+ | https://nodejs.org |
| Java 25 JDK | 25 | Only needed for local `mvn` outside Docker |

---

## Step 1 — Start Local Supabase

```bash
cd /path/to/LearnSystem
supabase start
```

This starts:
- **Auth API** at `http://localhost:54321`
- **Postgres DB** at `localhost:54322` (user: `postgres`, pass: `postgres`)
- **Supabase Studio** at `http://localhost:54323`

After first run, note the printed **Publishable Key** and **Secret Key** — they are stable across restarts for the same local project.

### Apply migrations

```bash
supabase db reset
```

This applies all migrations including the auth trigger fix (role = `'USER'` for new signups).

---

## Step 2 — Configure Environment

### Backend services

```bash
cp config/env/.env.local.example config/env/.env.local
```

For local Supabase the file ships pre-filled with default CLI values. No changes needed for a standard `supabase start`.

Key values for local use:
```dotenv
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_JWKS_URL=http://host.docker.internal:54321/auth/v1/.well-known/jwks.json
SUPABASE_SECRET_KEY=<from supabase start output — sb_secret_...>
SUPABASE_DB_URL=jdbc:postgresql://host.docker.internal:54322/postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=postgres
```

> ⚠️ **Never expose `SUPABASE_SECRET_KEY` / `sb_secret_*` in `NEXT_PUBLIC_*` variables.**

### Frontend (apps/web)

```bash
cp apps/web/.env.local.example apps/web/.env.local
# Or it is pre-filled for local Supabase — verify values match your supabase start output
```

Required frontend-only values (safe to be public):
```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # compat alias
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

## Step 3 — Start MVP Backend Stack

```bash
docker compose \
  -f infra/docker/docker-compose.mvp.yml \
  --env-file config/env/.env.local \
  up --build
```

First build takes ~5–8 min (Maven downloads dependencies). Subsequent builds use Docker layer cache.

Services started:
| Service | Internal port | External port |
|---|---|---|
| redis | 6379 | 6380 (host) |
| user-service | 8081 | (internal only) |
| learning-service | 8089 | (internal only) |
| gateway | 8080 | **8080 (host)** |

Health checks poll `/actuator/health` every 10s. Gateway starts after user-service and learning-service are healthy.

---

## Step 4 — Create & Promote Test Users

### Create users via Supabase Auth API

```bash
# USER (regular student)
curl -X POST http://localhost:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: <sb_publishable_...>" \
  -d '{"email":"test.user@example.com","password":"TestUser123!"}'

# ADMIN (pre-configured in .env.local bootstrap)
curl -X POST http://localhost:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: <sb_publishable_...>" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# TEACHER
curl -X POST http://localhost:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: <sb_publishable_...>" \
  -d '{"email":"teacher@example.com","password":"Teacher123!"}'
```

### Promote roles in DB

```bash
supabase db query "UPDATE public.users SET role = 'ADMIN' WHERE email = 'admin@example.com'"
supabase db query "UPDATE public.users SET role = 'TEACHER' WHERE email = 'teacher@example.com'"

# Verify
supabase db query "SELECT email, role FROM public.users ORDER BY role"
```

Expected result:
```
admin@example.com    ADMIN
teacher@example.com  TEACHER
test.user@example.com USER
```

---

## Step 5 — Start Frontend

```bash
cd apps/web
npm run dev
# or: pnpm dev
```

Frontend runs at `http://localhost:3000`.

---

## Step 6 — Smoke Tests

First, obtain a JWT for each test account:

```bash
export USER_TOKEN=$(curl -s -X POST http://localhost:54321/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: <sb_publishable_...>" \
  -d '{"email":"test.user@example.com","password":"TestUser123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

export ADMIN_TOKEN=$(curl -s -X POST http://localhost:54321/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: <sb_publishable_...>" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

export TEACHER_TOKEN=$(curl -s -X POST http://localhost:54321/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: <sb_publishable_...>" \
  -d '{"email":"teacher@example.com","password":"Teacher123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### Gateway health

```bash
curl -s http://localhost:8080/actuator/health | python3 -m json.tool
```

### USER routes

```bash
# Own profile
curl -s -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:8080/api/v1/users/me | python3 -m json.tool

# Active courses (enrolled as student)
curl -s -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:8080/api/v1/courses/my-active | python3 -m json.tool
```

### TEACHER routes

```bash
# Courses I teach
curl -s -H "Authorization: Bearer $TEACHER_TOKEN" \
  http://localhost:8080/api/v1/courses/my-teaching | python3 -m json.tool
```

### ADMIN routes

```bash
# All courses (admin)
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/api/v1/admin/courses | python3 -m json.tool

# All users (admin)
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/api/v1/admin/users | python3 -m json.tool
```

---

## Canonical Global Roles

| Role | Description | Notes |
|---|---|---|
| `ADMIN` | Platform administrator | Full access |
| `TEACHER` | Course instructor | Manage own courses |
| `USER` | Default registered user | Can enroll in courses |

> There is **no** global `STUDENT` or `TA` role. Course-level membership roles (`STUDENT`, `TA`, `TEACHER`, `OWNER`) are stored separately in `learning.course_members`.

---

## Stopping the Stack

```bash
# Stop without removing volumes (preserve DB data)
docker compose -f infra/docker/docker-compose.mvp.yml down

# Stop and remove volumes (full reset)
docker compose -f infra/docker/docker-compose.mvp.yml down -v

# Stop Supabase
supabase stop
```

---

## Excluded Services

| Service | Why excluded | When to add |
|---|---|---|
| `ai-service` | AI chat not required for core login + LMS flow | When testing AI tutoring features |
| `analytics-service` | Analytics routes proxy to learning-service already | When testing dedicated analytics dashboards |
| `execution-service` | VPL/code grading not required for MVP | When testing code assignment submission |
| `caddy` | Gateway binds directly to port 8080 locally | Production only (TLS termination) |

---

## Troubleshooting

### `public.users` trigger not firing
Run `supabase db reset` to reapply migrations including the trigger fix.

### Services can't connect to Supabase DB
Verify `host.docker.internal` resolves inside Docker. All services use `extra_hosts: [host.docker.internal:host-gateway]`. On Linux this maps to the Docker bridge IP.

### Gateway 502 on startup
User-service and learning-service take ~40s to start (JVM warmup + DB connection pool). Wait for `healthcheck` to pass before testing routes.

### `ddl-auto: validate` fails on startup
This means the DB schema doesn't match JPA entities. Run `supabase db reset` to rebuild schema from migrations.

### Port 8080 already in use
Change `GATEWAY_HOST_PORT=8081` in `config/env/.env.local` and restart compose.
