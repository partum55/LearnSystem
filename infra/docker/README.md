# LearnSystem — Docker Infrastructure

## Overview

One canonical Docker Compose file manages the entire backend runtime stack.

```
infra/docker/
  docker-compose.yml   ← canonical compose (single file, two modes)
  Caddyfile            ← HTTPS reverse proxy config (production only)
  README.md            ← this file
```

---

## Run Modes

### Local Development

The backend runs in Docker. The Next.js frontend runs on the host with `npm run dev`.

```bash
./scripts/dev.sh
```

What this does:
1. Runs `scripts/preflight.sh local` to validate your env
2. Starts: `redis`, `user-service`, `learning-service`, `ai-service`, `analytics-service`, `gateway`, `execution-service`
3. Caddy does **not** start locally

Then in a separate terminal:
```bash
cd apps/web && npm run dev
```

Frontend: `http://localhost:3000`  
Gateway API: `http://localhost:8080`

### Production

```bash
./scripts/prod.sh
```

What this does:
1. Runs `scripts/preflight.sh production` to validate your env
2. Starts all backend services plus Caddy (`--profile prod`)
3. Caddy obtains TLS certificates automatically via Let's Encrypt

Public endpoints:  
API: `https://api.learnsystem.app`  
Frontend: `https://app.learnsystem.app` (Vercel — not in Docker)

---

## Environment Files

| File | Purpose |
|------|---------|
| `config/env/.env.local.example` | Template for local dev |
| `config/env/.env.production.example` | Template for production |
| `config/env/.env.local` | Your filled local secrets (gitignored) |
| `config/env/.env.production` | Your filled production secrets (gitignored) |

Copy the appropriate template and fill in your secrets:
```bash
cp config/env/.env.local.example config/env/.env.local
# edit config/env/.env.local
```

---

## Services

| Service | Port (internal) | Local host port | Public? |
|---------|----------------|-----------------|---------|
| caddy | 80, 443 | 80, 443 | Yes (prod only) |
| gateway | 8080 | 8080 (local) / 127.0.0.1:8080 (prod) | Via Caddy only |
| user-service | 8081 | — (expose only) | No |
| learning-service | 8089 | — (expose only) | No |
| ai-service | 8085 | — (expose only) | No |
| analytics-service | 8088 | — (expose only) | No |
| execution-service | 3000 | — (expose only) | No |
| redis | 6379 | 6380 (local) / 127.0.0.1:6380 (prod) | No |

**Public access path:** `internet → Caddy (443) → gateway (8080) → microservices`

In production, `GATEWAY_HOST_PORT=127.0.0.1:8080` ensures the gateway binds only to the loopback interface. Caddy reaches it via the internal Docker network (`lms-network`).

---

## Running Specific Services

Verbose with logs:
```bash
docker compose -f infra/docker/docker-compose.yml \
  --env-file config/env/.env.local up --build
```

Detached:
```bash
docker compose -f infra/docker/docker-compose.yml \
  --env-file config/env/.env.local up -d --build
```

Stop:
```bash
docker compose -f infra/docker/docker-compose.yml \
  --env-file config/env/.env.local down
```

Logs:
```bash
docker compose -f infra/docker/docker-compose.yml \
  --env-file config/env/.env.local logs -f gateway
```

---

## Troubleshooting

**Services fail to start — missing env vars**  
Run `./scripts/preflight.sh local` to identify the issue.

**Gateway not reachable at localhost:8080**  
Check that `GATEWAY_HOST_PORT=8080` is set in your `.env.local`.

**Caddy fails to get TLS certificate**  
Ensure `api.learnsystem.app` DNS points to the server's IP before running prod.

**Java service OOM**  
Increase `JAVA_OPTS` heap values in the compose file or ensure the host has enough RAM (minimum 4 GB for full stack).

**execution-service fails to start**  
The service requires Linux and `privileged: true` for the isolate sandbox. It cannot run on macOS directly — use a Linux VM or CI.

**Redis connection refused**  
The Spring services connect to `redis` on port `6379` within the Docker network. Do not change the internal hostname.
