# Environment Variables Reference

This document lists the active environment contracts used by the current Docker/Vite setup.

## Source of truth

- Local Docker stack: root `.env.example`
- Production Docker stack: `.env.production.example`
- Frontend dev/proxy config: `frontend/.env.example`

## Root `.env` (Docker/local)

### Security

- `JWT_SECRET`
- `JWT_EXPIRATION`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_FRONTEND_SUCCESS_URI`
- `GOOGLE_OAUTH_FRONTEND_FAILURE_URI`
- `GOOGLE_OAUTH_ALLOWED_DOMAINS`
- `GOOGLE_OAUTH_ALLOWED_DOMAIN` (legacy compatibility)

### AI

- `LLAMA_API_URL`
- `LLAMA_API_KEY`
- `LLAMA_MODEL`

### Gateway rate limits

- `QUIZ_ATTEMPT_RATE_LIMIT_REPLENISH_RATE`
- `QUIZ_ATTEMPT_RATE_LIMIT_BURST_CAPACITY`
- `QUIZ_ATTEMPT_RATE_LIMIT_REQUESTED_TOKENS`

### Database container defaults

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

## Root `.env.production` (Docker/prod)

### Supabase database

- `SUPABASE_DB_HOST`
- `SUPABASE_DB_PORT`
- `SUPABASE_DB_NAME`
- `SUPABASE_DB_USER`
- `SUPABASE_DB_PASSWORD`

### Security / OAuth / AI

- Same keys as local for JWT, Google OAuth, and LLAMA provider.

### Bootstrap admin

- `BOOTSTRAP_ADMIN_ENABLED`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

### Gateway CORS

- `GATEWAY_CORS_ALLOWED_ORIGINS`

## Frontend `.env` (Vite)

Preferred keys:

- `VITE_API_URL`
- `VITE_AI_SERVICE_URL`
- `VITE_API_TARGET`
- `VITE_REQUIRE_UCU_EMAIL`
- `VITE_VAPID_PUBLIC_KEY`

Legacy aliases still supported by code (not preferred):

- `REACT_APP_API_URL`
- `REACT_APP_AI_SERVICE_URL`
- `REACT_APP_REQUIRE_UCU_EMAIL`
- `REACT_APP_VAPID_PUBLIC_KEY`

## Service-level compatibility notes

Some backend services still accept legacy aliases internally (for example `DB_URL` or `DATABASE_URL` in specific profiles).  
For new configuration and docs, prefer the canonical environment templates above and avoid introducing new aliases.
