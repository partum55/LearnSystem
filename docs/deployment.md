# Deployment

## Production Server

SSH:

```powershell
ssh root@167.99.240.242
cd /opt/learnsystem
```

Deploy backend:

```powershell
git pull
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml build --progress=plain
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml up -d --force-recreate
docker compose -f infra/docker/docker-compose.prod.yml ps -a
curl -i https://api.learnsystem.app/api/v1/actuator/health
```

Do not recommend `docker compose down -v` unless the explicit intent is to destroy volumes/data.

## Frontend Auto-Deploy

The frontend deploys after push. After pushing frontend changes:

1. Wait at least 90 seconds.
2. Use a fresh browser context or hard refresh.
3. Verify production UI and network calls through the visible app.

## Environment Variables

Mask secrets in docs, logs, screenshots, and reports.

Required families:

- Supabase:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - JWT/signing configuration used by backend services.
- Service URLs:
  - `USER_SERVICE_URL`
  - `LEARNING_SERVICE_URL`
  - `AI_SERVICE_URL`
  - analytics URL if analytics is enabled.
- AI:
  - `AI_FEATURES_ENABLED`
  - `AI_DEFAULT_PROVIDER`
  - `AI_GEMINI_MODEL`
  - `AI_SYSTEM_GEMINI_API_KEY`
  - `AI_KEY_ENCRYPTION_SECRET`
- Internal auth:
  - `INTERNAL_SERVICE_TOKEN`

## Verification

Minimum production verification after deploy:

```powershell
docker compose -f infra/docker/docker-compose.prod.yml ps -a
curl -i https://api.learnsystem.app/api/v1/actuator/health
```

Then verify a browser flow through `apps/web` production, using the UI rather than guessed routes.

## Reporting Rules

- Do not include raw secrets, passwords, API keys, bearer tokens, cookies, or full env files in deployment notes.
- Mask sensitive headers and environment values in logs/screenshots.
