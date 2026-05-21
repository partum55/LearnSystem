#!/usr/bin/env bash
# ==========================================
# LearnSystem — MVP Backend (minimal stack)
# ==========================================
# Starts only the required MVP services:
#   redis · user-service · learning-service · gateway
#
# Usage:
#   ./scripts/dev-mvp.sh            # start (attached — see logs)
#   ./scripts/dev-mvp.sh -d         # start detached
#   ./scripts/dev-mvp.sh --build    # force rebuild images
#
# Stop:
#   docker compose -f infra/docker/docker-compose.mvp.yml \
#     --env-file config/env/.env.local down

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="infra/docker/docker-compose.mvp.yml"
ENV_FILE="config/env/.env.local"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         LearnSystem — MVP Backend                    ║"
echo "║         (redis · user · learning · gateway)         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌  $ENV_FILE not found."
  echo "    Copy the example: cp config/env/.env.local.example config/env/.env.local"
  exit 1
fi

# Check Supabase is running
if ! curl -sf http://localhost:54321/health > /dev/null 2>&1; then
  echo "❌  Supabase local instance not detected at http://localhost:54321"
  echo "    Run: supabase start"
  exit 1
fi

echo "✅  Supabase detected at localhost:54321"
echo ""
echo "Starting MVP backend..."
echo "Command: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up --build $*"
echo ""

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build "$@"

echo ""
echo "────────────────────────────────────────────────────────"
echo "  MVP Service URLs:"
echo "    Gateway API:  http://localhost:8080"
echo "    Supabase:     http://localhost:54321"
echo "    Studio:       http://localhost:54323"
echo ""
echo "  Start the frontend separately:"
echo "    cd apps/web && npm run dev"
echo "    Frontend:     http://localhost:3000"
echo ""
echo "  Smoke test:"
echo "    curl http://localhost:8080/actuator/health"
echo "────────────────────────────────────────────────────────"
