# Environment Variables Reference

LearnSystem uses standardized environment variables across the frontend and all backend microservices.

## Global Canonical Variables

| Variable | Description |
| :--- | :--- |
| `APP_URL` | Main web application URL (`https://app.learnsystem.app`) |
| `API_URL` | Main Java API Gateway URL (`https://api.learnsystem.app`) |
| `LANDING_URL` | Marketing landing site URL (`https://learnsystem.app`) |

## Next.js (Frontend)

Prefix variables with `NEXT_PUBLIC_` to make them available in the browser.

| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Same as `APP_URL` |
| `NEXT_PUBLIC_API_URL` | Same as `API_URL` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable key (`sb_publishable_...`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Alias) Same as publishable key |

## Java Microservices (Backend)

| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_JWKS_URL` | URL to Supabase JWKS (`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`) |
| `SUPABASE_SECRET_KEY` | Your Supabase secret key (`sb_secret_...`) — **NEVER expose to frontend** |
| `SUPABASE_DB_URL` | JDBC connection string to Supabase Postgres (from Connect dashboard) |
| `SUPABASE_DB_USER` | Postgres user (from Connect dashboard) |
| `SUPABASE_DB_PASSWORD` | Postgres password |
| `FRONTEND_URL` | URL of the frontend (for CORS) |

### Legacy / Deprecated Variables

- `SUPABASE_JWT_SECRET`: Used for legacy HMAC validation. New code uses JWKS.
- `SUPABASE_SERVICE_ROLE_KEY`: Replaced by `SUPABASE_SECRET_KEY`.
- `SUPABASE_ANON_KEY`: Replaced by `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Internal Service Discovery (Production)

Internal microservices should communicate using Docker service names.

- `USER_SERVICE_URL=http://user-service:8081`
- `LEARNING_SERVICE_URL=http://learning-service:8089`
- `AI_SERVICE_URL=http://ai-service:8085`
- `EXECUTION_SERVICE_URL=http://execution-service:3000`
