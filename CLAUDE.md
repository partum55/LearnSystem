# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack Learning Management System: Spring Boot microservices backend, React + TypeScript frontend, Docker-based infrastructure with split deployment support (Vercel + DigitalOcean + Supabase).

## Branch Strategy

- **`main`** — Production-ready. `docker-compose.yml` uses external Supabase PostgreSQL, no local DB container. Requires `.env.production`.
- **`dev`** — Local development. Includes local PostgreSQL container. Uses `.env`.

## Architecture

```
Frontend (React+TS, Vite :5173 / Nginx :3000 / Vercel)
    │
API Gateway (Spring Cloud Gateway :8080, Eureka, Resilience4j, Bucket4j rate limiting)
    │
    ├── User Service (:8081) — Auth, JWT, Google OAuth SSO, user management
    ├── Learning Service (:8089) — Modular monolith: courses, assessments, gradebook, submissions, deadlines, plugin runtime
    ├── AI Service (:8085) — Groq Llama API integration, content generation (WebFlux)
    ├── Analytics Service (:8088) — Teacher analytics, Feign clients to other services
    ├── Marketplace Service (:8086) — Plugin marketplace
    └── Eureka Server (:8761) — Service discovery
         │
    PostgreSQL (Supabase on main / local :5432 on dev) + Redis (:6380)
```

The Learning Service is a **modular monolith** — one Spring Boot app with distinct domain packages (courses, assessments, gradebook, submissions, deadlines) rather than separate microservices. It also hosts the plugin runtime (Python sidecar via FastAPI).

## Development Commands

### Docker — Production (main branch)
```bash
cp .env.production.example .env.production  # Fill in Supabase, JWT, Groq keys
./run-local.sh build    # First time: build + start all containers
./run-local.sh          # Start (after first build)
./run-local.sh stop     # Stop all
./run-local.sh restart  # Restart all services
./run-local.sh clean    # Stop + remove data volumes
./run-local.sh status   # Health check all services
./run-local.sh logs     # Stream logs
```

### Docker — Development (dev branch)
```bash
cp .env.example .env    # Configure local DB passwords, JWT_SECRET, LLAMA_API_KEY
docker compose up --build -d    # Includes local PostgreSQL container
```

### Frontend
```bash
cd frontend
npm install             # Install deps
npm run dev             # Vite dev server (:5173), proxies /api → localhost:8080
npm run build           # TypeScript check + Vite production build
npm run lint            # ESLint (flat config)
npm run test:contracts  # API contract tests (Node native test runner)
npx tsc --noEmit        # Type check only
```

### Backend
```bash
cd backend-spring
mvn clean install                           # Build all services
mvn test                                    # Unit tests
mvn verify                                  # Integration tests
mvn test -Dtest=ClassName                   # Single test class
mvn test -Dtest=ClassName#methodName        # Single test method
cd lms-learning-service && mvn spring-boot:run  # Run one service locally
```

### E2E Tests
```bash
cd e2e-tests
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                        # Set BASE_URL, API_URL, test credentials

pytest                                      # Run all tests
pytest -m smoke                             # Smoke tests only
pytest -m critical                          # Critical path tests
pytest -n auto                              # Parallel execution
pytest --html=report.html                   # HTML report
pytest --alluredir=allure-results           # Allure reporting
```

Markers: `@pytest.mark.smoke`, `.critical`, `.auth`, `.course`, `.quiz`, `.assignment`, `.ai`, `.api`, `.slow`, `.flaky`. Uses Page Object Model pattern (`pages/`, `tests/`, `utils/`).

## Code Structure

### Backend (`backend-spring/`)
- **lms-common** — Shared DTOs, security helpers, rate limiting (bucket4j), validation
- **lms-user-service** — Spring Security + JWT (jjwt 0.12.3), Google OAuth SSO, user CRUD, AES-256-GCM encryption for user API keys
- **lms-learning-service** — Domain modules under `com.university.lms.{course,assessment,gradebook,submission,deadline}`. Flyway migrations, iCal4j calendar, WebSocket, mail support, plugin runtime
- **lms-ai-service** — Spring WebFlux async HTTP to Groq/Llama API (also supports Together AI, OpenAI, Ollama)
- **lms-analytics-service** — Feign clients to other services for cross-service queries
- **lms-marketplace-service** — Plugin marketplace for discovering/installing plugins
- **lms-plugin-sdk** — Plugin contract definitions and shared types
- **lms-plugin-runtime** — Python plugin execution via FastAPI sidecar, health monitoring, auto-restart
- **lms-api-gateway** — Route predicates in `application.yml`, circuit breaker, rate limiting
- **lms-eureka-server** — Netflix Eureka

Tech: Java 21, Spring Boot 3.2.2, Spring Cloud 2023.0.0, PostgreSQL, Redis, Flyway, Lombok, MapStruct.

### Plugin System
Python plugins packaged as ZIP with `plugin.json` manifest. Plugin types include ANALYTICS. Learning Service runs FastAPI sidecars and proxies requests via `/api/plugins/{pluginId}/**`. Contract documented in `docs/plugins/python-plugin-contract.md`.

### Frontend (`frontend/src/`)
- **api/** — Axios clients (`client.ts` base instance with token refresh, protocol-aware URL detection), per-domain endpoints
- **queries/** + **mutations/** — React Query hooks for data fetching/mutations
- **store/** — Zustand stores (auth, UI state)
- **pages/** — Route-level components
- **components/** — Reusable UI, design system components
- **i18n/** — i18next with `en.json` and `uk.json` locales
- **types/** — TypeScript interfaces matching backend DTOs
- **hooks/** — Custom hooks (network status, etc.)

Tech: React 18, TypeScript 5.9, Vite 7, Tailwind CSS 3, Zustand, React Query 5, Monaco Editor, Recharts, HeadlessUI, i18next.

### Frontend Design System ("Obsidian")
Dark monochrome design using CSS custom properties in `design-system.css`:
- Colors: Zinc scale (`--bg-base: #09090b` through `--text-primary: #fafafa`), no accent colors in chrome
- Functional colors only: `--fn-success`, `--fn-error`, `--fn-warning`
- Fonts: Sora (display), Outfit (body), JetBrains Mono (code)
- Borders: `rgba(255,255,255,0.08)` default
- Component classes: `.btn`, `.btn-primary`, `.card`, `.input`, `.badge`, `.table-container`

### Dockerfiles
- `Dockerfile` — Generic service builder
- `Dockerfile.learning` — Learning service with Java 21 + Python support for plugin runtime
- `Dockerfile.local` — Local development variant

### Docker Memory Limits
Learning Service and AI Service: 1024M. User/Analytics/Gateway: 512M. Eureka/Marketplace: 384M. Frontend: 128M. Redis: 256M.

## Deployment

Four deployment options documented in `DEPLOY.md`:
- **Option A** — All-in-one on a single DigitalOcean Droplet
- **Option B** — Split: Vercel (frontend) + DigitalOcean Droplet (backend) + Supabase (DB), with custom domain + Let's Encrypt SSL
- **Option C** — Split with Vercel proxy (no domain needed): Vercel rewrites `/api/*` to Droplet, eliminating CORS/HTTPS issues
- **Option D** — DigitalOcean App Platform (managed PaaS, auto HTTPS) + Vercel + Supabase. Zero server management, auto-deploy on push. App spec: `.do/app.yaml`

Vercel config: `frontend/vercel.json` — SPA routing + API proxy rewrite via `BACKEND_URL` env var.

CORS is controlled per-service via `GATEWAY_CORS_ALLOWED_ORIGINS` env var. All external-facing URLs default to HTTPS. Internal Docker networking (Eureka, service-to-service) uses HTTP.

## Contract Testing

Frontend and backend contracts ensure API consistency:
- **Frontend**: `contracts/frontend-gateway-route-contract.test.mjs` — scans `.tsx` files for API calls, validates they match gateway route patterns
- **Backend**: `LearningEndpointContractTest.java` — validates controller paths match `application.yml`
- **CI**: GitHub Actions runs contract tests on PRs touching frontend or gateway config

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `frontend-contracts.yml` — Contract tests on frontend/gateway config changes
- `quality-gates.yml` — Quality gate checks
- `security-scan.yml` — Security scanning

## Environment Setup

Prerequisites: Docker + Docker Compose, Node.js 22+, npm 10+, Java 21, Maven 3.9+.

Key env vars: `LLAMA_API_KEY` (Groq), `JWT_SECRET`, `AES_ENCRYPTION_KEY`, `INTERNAL_SERVICE_TOKEN`, `SUPABASE_DB_URL` (production), `POSTGRES_PASSWORD` (dev), `VITE_API_URL` (default `/api`), `GATEWAY_CORS_ALLOWED_ORIGINS`.

Google OAuth: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_OAUTH_FRONTEND_SUCCESS_URI`, `GOOGLE_OAUTH_FRONTEND_FAILURE_URI`, `GOOGLE_OAUTH_ALLOWED_DOMAINS`.

Admin bootstrap: `BOOTSTRAP_ADMIN_ENABLED`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`.

Full env var reference: `docs/ENVIRONMENT_VARIABLES.md`.

## Documentation

Key docs in `docs/`:
- `plugins/python-plugin-contract.md` — Plugin API contract
- `ai/ai-content-control.md` — AI content generation schemas (`docs/ai/schemas/` for JSON schemas)
- `FRONTEND_AUTHORING_SYSTEM.md` — Task/assessment authoring UI architecture
- `LMS_EDITOR_QUIZ_ARCHITECTURE.md` — Quiz editor details
- `OPERATIONS_RUNBOOK.md` — Operations guide
- `DATABASE_MIGRATION_PLAN.md` — Migration strategy
- `adr/0001-learning-service-modular-monolith.md` — Architecture decision record

## Local URLs

| Service | URL |
|---------|-----|
| Frontend (Vite dev) | http://localhost:5173 |
| Frontend (Docker) | http://localhost:3000 |
| API Gateway | http://localhost:8080 |
| Eureka Dashboard | http://localhost:8761 |
| User Service | http://localhost:8081 |
| Learning Service | http://localhost:8089 |
| AI Service | http://localhost:8085 |
| Marketplace Service | http://localhost:8086 |
| Analytics Service | http://localhost:8088 |
