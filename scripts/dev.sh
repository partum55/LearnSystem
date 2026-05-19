#!/usr/bin/env bash
# ==========================================
# LearnSystem — Local Backend
# ==========================================
# Runs preflight checks, then starts all backend services locally.
# The Next.js frontend is NOT started here — run it separately.
#
# Usage:
#   ./scripts/dev.sh            # start (attached, see logs)
#   ./scripts/dev.sh -d         # start detached
#   ./scripts/dev.sh --build    # force rebuild images
#
# Stop:
#   docker compose -f infra/docker/docker-compose.yml \
#     --env-file config/env/.env.local down

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="infra/docker/docker-compose.yml"
ENV_FILE="config/env/.env.local"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         LearnSystem — Local Backend                  ║"
echo "╚══════════════════════════════════════════════════════╝"

# Run preflight first
bash scripts/preflight.sh local

echo ""
echo "Starting backend services..."
echo "Command: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up --build $*"
echo ""

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build "$@"

echo ""
echo "────────────────────────────────────────────────────────"
echo "  Backend URLs:"
echo "    Gateway API:  http://localhost:8080"
echo "    Redis:        localhost:6380 (for local debugging)"
echo ""
echo "  Start the frontend separately:"
echo "    cd apps/web && npm run dev"
echo "    Frontend:     http://localhost:3000"
echo "────────────────────────────────────────────────────────"
