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
    ├── User Service (:8081) — Auth, JWT, user management
    ├── Learning Service (:8089) — Modular monolith: courses, assessments, gradebook, submissions, deadlines
    ├── AI Service (:8085) — Groq Llama API integration, content generation (WebFlux)
    ├── Analytics Service (:8088) — Teacher analytics, Feign clients to other services
    └── Eureka Server (:8761) — Service discovery
         │
    PostgreSQL (Supabase on main / local :5432 on dev) + Redis (:6380)
```

The Learning Service is a **modular monolith** — one Spring Boot app with distinct domain packages (courses, assessments, gradebook, submissions, deadlines) rather than separate microservices.

## Development Commands

### Docker — Production (main branch)
```bash
cp .env.production.example .env.production  # Fill in Supabase, JWT, Groq keys
./run-local.sh build    # First time: build + start all containers
./run-local.sh          # Start (after first build)
./run-local.sh stop     # Stop all
./run-local.sh clean    # Stop + remove data volumes
./run-local.sh status   # Health check all services
./run-local.sh logs     # Stream logs
```

### Docker — Development (dev branch)
```bash
cp .env.example .env    # Configure local DB passwords, JWT_SECRET, LLAMA_API_KEY
./run-local.sh build    # Includes local PostgreSQL container
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

## Code Structure

### Backend (`backend-spring/`)
- **lms-common** — Shared DTOs, security helpers, rate limiting (bucket4j), validation
- **lms-user-service** — Spring Security + JWT (jjwt 0.12.3), user CRUD
- **lms-learning-service** — Domain modules under `com.university.lms.{course,assessment,gradebook,submission,deadline}`. Flyway migrations, iCal4j calendar, WebSocket, mail support
- **lms-ai-service** — Spring WebFlux async HTTP to Groq/Llama API
- **lms-analytics-service** — Feign clients to other services for cross-service queries
- **lms-api-gateway** — Route predicates in `application.yml`, circuit breaker, rate limiting
- **lms-eureka-server** — Netflix Eureka

Tech: Java 21, Spring Boot 3.2.2, Spring Cloud 2023.0.0, PostgreSQL, Redis, Flyway, Lombok, MapStruct.

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

## Environment Setup

Prerequisites: Docker + Docker Compose, Node.js 18+, Java 21, Maven 3.9+.

Key env vars: `LLAMA_API_KEY` (Groq), `JWT_SECRET`, `SUPABASE_DB_URL` (production), `POSTGRES_PASSWORD` (dev), `VITE_API_URL` (default `/api`), `GATEWAY_CORS_ALLOWED_ORIGINS`.

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
| Analytics Service | http://localhost:8088 |
