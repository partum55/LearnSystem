# LearnSystem

A modern, scalable learning management system built with Next.js, Supabase, and Java Spring Boot.

## Repository Structure

- `apps/web` — Next.js application (hosted on Vercel at `app.learnsystem.app`)
- `apps/landing` — Placeholder for the marketing site (`learnsystem.app`)
- `services/gateway` — Java API Gateway (public entry point at `api.learnsystem.app`)
- `services/*` — Internal Java microservices (User, Learning, AI, Analytics)
- `services/execution-service` — Internal Python code execution runner
- `supabase` — Supabase migrations and configuration
- `infra/docker` — Canonical Docker Compose file and Caddy config
- `config/env` — Environment variable templates
- `docs` — Architecture and deployment documentation

## Deployment Targets

| Layer | Host | Entry |
|-------|------|-------|
| Frontend | Vercel | `https://app.learnsystem.app` |
| Backend API | DigitalOcean (Docker) | `https://api.learnsystem.app` |
| Database / Auth / Storage | Supabase cloud | — |

---

## Quick Start — Local Development

**1. Copy and fill the env template:**
```bash
cp config/env/.env.local.example config/env/.env.local
# edit config/env/.env.local — fill in your Supabase secrets and Groq API key
```

**2. Start the backend:**
```bash
./scripts/dev.sh
```

**3. Start the frontend (separate terminal):**
```bash
cd apps/web && npm run dev
```

- Frontend: `http://localhost:3000`
- Gateway API: `http://localhost:8080`

---

## Quick Start — Production

**1. Copy and fill the production env template:**
```bash
cp config/env/.env.production.example config/env/.env.production
# edit config/env/.env.production — fill in all secrets
```

**2. Start the production stack:**
```bash
./scripts/prod.sh
```

- API: `https://api.learnsystem.app` (via Caddy TLS)
- Frontend: `https://app.learnsystem.app` (Vercel — separate deploy)

---

## Environment Setup

| File | Purpose |
|------|---------|
| `config/env/.env.local.example` | Template for local dev |
| `config/env/.env.production.example` | Template for production |

See `docs/env.md` for a full list of required variables.

---

## Docker Infrastructure

The canonical Docker Compose file is:
```
infra/docker/docker-compose.yml
```

There is **one** compose file. Do not create `docker-compose.dev.yml`, `docker-compose.prod.yml`, or other variants — use the env files and `--profile prod` flag to switch modes.

See `infra/docker/README.md` for full Docker documentation.

---

## Documentation

- [Local Development Guide](docs/local-development.md)
- [Architecture Overview](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [Environment Variables](docs/env.md)
- [Docker Infrastructure](infra/docker/README.md)
