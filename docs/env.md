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
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anonymous key |

## Java Microservices (Backend)

| Variable | Description |
| :--- | :--- |
| `SUPABASE_DB_URL` | JDBC connection string to Supabase Postgres |
| `SUPABASE_DB_USER` | Postgres user (usually `postgres`) |
| `SUPABASE_DB_PASSWORD` | Postgres password |
| `SUPABASE_JWT_SECRET` | Secret used to validate Supabase JWTs |
| `FRONTEND_URL` | URL of the frontend (for CORS) |

## Internal Service Discovery (Production)

Internal microservices should communicate using Docker service names.

- `USER_SERVICE_URL=http://user-service:8081`
- `LEARNING_SERVICE_URL=http://learning-service:8089`
- `AI_SERVICE_URL=http://ai-service:8085`
- `EXECUTION_SERVICE_URL=http://execution-service:3000`
