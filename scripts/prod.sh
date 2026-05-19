#!/usr/bin/env bash
# ==========================================
# LearnSystem — Production Backend
# ==========================================
# Runs preflight checks, then starts all backend services in production mode.
# Caddy handles HTTPS via Let's Encrypt automatically.
# Frontend is deployed on Vercel — not started here.
#
# Usage:
#   ./scripts/prod.sh            # start (detached)
#   ./scripts/prod.sh --build    # force rebuild images
#
# Manage running stack:
#   docker compose -f infra/docker/docker-compose.yml \
#     --env-file config/env/.env.production --profile prod logs -f
#   docker compose -f infra/docker/docker-compose.yml \
#     --env-file config/env/.env.production --profile prod ps
#   docker compose -f infra/docker/docker-compose.yml \
#     --env-file config/env/.env.production --profile prod down

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="infra/docker/docker-compose.yml"
ENV_FILE="config/env/.env.production"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         LearnSystem — Production                     ║"
echo "╚══════════════════════════════════════════════════════╝"

# Run preflight first
bash scripts/preflight.sh production

echo ""
echo "Starting production services (detached)..."
echo "Command: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE --profile prod up -d --build $*"
echo ""

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile prod up -d --build "$@"

echo ""
echo "────────────────────────────────────────────────────────"
echo "  Production services started."
echo ""
echo "  Public endpoints:"
echo "    API:      https://api.learnsystem.app"
echo "    Frontend: https://app.learnsystem.app  (Vercel)"
echo "    Landing:  https://learnsystem.app      (Vercel)"
echo ""
echo "  Manage the stack:"
echo "    Logs:     docker compose -f $COMPOSE_FILE --env-file $ENV_FILE --profile prod logs -f"
echo "    Status:   docker compose -f $COMPOSE_FILE --env-file $ENV_FILE --profile prod ps"
echo "    Stop:     docker compose -f $COMPOSE_FILE --env-file $ENV_FILE --profile prod down"
echo "────────────────────────────────────────────────────────"
