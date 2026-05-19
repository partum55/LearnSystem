# Local Development Guide

This guide explains how to run the LearnSystem project locally while connecting to your remote **cloud Supabase** project for Auth, PostgreSQL, and Storage.

## 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker](https://www.docker.com/) & Docker Compose
- Java 25 & Maven (Optional: if you want to run backend services via IDE instead of Docker)
- A Supabase Project (Create one at [supabase.com](https://supabase.com))

## 2. Supabase Dashboard Setup

For the local login flow to work correctly, you must configure your cloud Supabase project to allow local redirects.

1. Go to **Authentication > URL Configuration** in your Supabase Dashboard.
2. Set the **Site URL** to: `http://localhost:3000`
3. Add the following **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://app.learnsystem.app/**`
   - `https://learnsystem.app/**`
4. If using Supabase Storage, ensure the required buckets (`avatars`, `submissions`, `general`) are created and RLS policies are applied.

## 3. Environment Variables

We use standardized environment variables. Do not commit real secrets.

### Backend/Docker Environment
1. Copy the example file:
   ```bash
   cp config/env/.env.local.example config/env/.env.local
   ```
2. Open `config/env/.env.local` and fill in your Supabase DB connection details and JWT secret (found in Supabase Dashboard > Settings > API).

### Frontend Environment
1. Copy the example file:
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   ```
2. Open `apps/web/.env.local` and fill in your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (found in Supabase Dashboard > Settings > API).

## 4. Running the Project Locally

**Make sure Docker is running before executing these.**

### Start the Backend
```bash
./scripts/dev.sh
```

This runs a preflight check, then starts all backend services. The API Gateway will be available at `http://localhost:8080`.

### Start the Frontend (separate terminal)
```bash
cd apps/web && npm run dev
```

## 5. Testing the Flow

1. Open `http://localhost:3000` in your browser.
2. Register or Login using Supabase Auth.
3. Check that the session is created.
4. The frontend will automatically attach the Supabase access token (JWT) to API requests.
5. Make an action (e.g., loading the Dashboard or My Courses) and verify that requests are sent to `http://localhost:8080/api/...`.
6. The local Java API Gateway validates the token using your `SUPABASE_JWT_SECRET` and forwards the request to the internal microservices (like `learning-service`), which read/write to your cloud Supabase database.

## 6. Common Errors

- **CORS Error:** Ensure `GATEWAY_CORS_ALLOWED_ORIGINS` in your docker env includes `http://localhost:3000`.
- **Invalid JWT / 401 Unauthorized:** Make sure the `SUPABASE_JWT_SECRET` in your backend env matches the one in your Supabase project.
- **Connection Refused (DB):** Check your `SUPABASE_DB_PASSWORD` and `SUPABASE_DB_HOST`. Ensure your network allows connecting to port 6543 (Supavisor pooler).
- **Service Not Found (502 Gateway):** Wait for the Java microservices to fully boot up (2–4 minutes on first start). Check logs with `docker compose -f infra/docker/docker-compose.yml --env-file config/env/.env.local logs -f`.
