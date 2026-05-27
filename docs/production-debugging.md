# Production Debugging

## Flow

Use one root cause -> one minimal clean fix -> tests/build -> redeploy -> report.

Avoid compatibility hacks. If a route, schema, or frontend call is wrong, fix it at the canonical layer.

## Server Checks

SSH:

```powershell
ssh root@167.99.240.242
cd /opt/learnsystem
```

Container status:

```powershell
docker compose -f infra/docker/docker-compose.prod.yml ps -a
```

Health:

```powershell
curl -i https://api.learnsystem.app/api/v1/actuator/health
```

Logs:

```powershell
docker compose -f infra/docker/docker-compose.prod.yml logs --tail=200 user-service
docker compose -f infra/docker/docker-compose.prod.yml logs --tail=200 learning-service
docker compose -f infra/docker/docker-compose.prod.yml logs --tail=200 ai-service
docker compose -f infra/docker/docker-compose.prod.yml logs --tail=200 gateway
docker compose -f infra/docker/docker-compose.prod.yml logs --tail=200 caddy
```

## Browser Debugging

Check:

- Console errors.
- Failed network requests.
- Route mismatches.
- Accidental `/api/v1/v1` duplication.
- Stale frontend bundle.
- Auth token missing/expired.
- Backend 401 caused by missing canonical user sync.

After frontend push, wait 90 seconds before testing production and use a fresh browser context or hard refresh.

## Reporting Rules

- Do not include raw secrets, passwords, API keys, bearer tokens, cookies, or full env files.
- Report exact failing route, status code, service log excerpt, and the minimal fix.
- Do not mark a production flow as passing if the UI element was not found; report `NOT_FOUND_IN_UI`.
