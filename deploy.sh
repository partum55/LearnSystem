#!/bin/bash
# ==========================================
# LearnSystemUCU - DigitalOcean Deployment
# ==========================================
# Run this on a fresh Ubuntu 24.04 Droplet (4GB+ RAM).
#
# Usage:
#   curl -fsSL <raw-github-url>/deploy.sh | bash
#   — or —
#   git clone <repo> && cd LearnSystemUCU && bash deploy.sh
#
# ==========================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="/opt/lms"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"

log()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERR]${NC}   $*"; }

# ==========================================
# 1. Install Docker
# ==========================================
install_docker() {
    if command -v docker &>/dev/null && docker compose version &>/dev/null; then
        ok "Docker + Compose already installed"
        return
    fi

    log "Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # DEB822 format (current as of 2025+)
    tee /etc/apt/sources.list.d/docker.sources > /dev/null <<REPO
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
REPO

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    ok "Docker installed"
}

# ==========================================
# 2. Clone / update repo
# ==========================================
setup_repo() {
    if [ -d "$REPO_DIR/.git" ]; then
        log "Updating existing repo at $REPO_DIR..."
        cd "$REPO_DIR"
        git pull --ff-only
    else
        log "Cloning repository..."
        read -rp "Git repo URL (HTTPS): " REPO_URL
        git clone "$REPO_URL" "$REPO_DIR"
        cd "$REPO_DIR"
    fi
    ok "Repository ready at $REPO_DIR"
}

# ==========================================
# 3. Configure environment
# ==========================================
setup_env() {
    cd "$REPO_DIR"

    if [ -f "$ENV_FILE" ]; then
        warn "$ENV_FILE already exists — skipping creation"
        warn "Edit it manually if needed: nano $REPO_DIR/$ENV_FILE"
        return
    fi

    if [ ! -f ".env.production.example" ]; then
        err ".env.production.example not found in repo!"
        exit 1
    fi

    cp .env.production.example "$ENV_FILE"
    log "Created $ENV_FILE from template"
    echo ""
    warn "You MUST edit $ENV_FILE before continuing!"
    warn "Fill in: SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD, JWT_SECRET, LLAMA_API_KEY"
    echo ""
    read -rp "Open $ENV_FILE in nano now? (Y/n) " OPEN_EDITOR
    if [[ "${OPEN_EDITOR:-Y}" =~ ^[Yy]$ ]]; then
        nano "$ENV_FILE"
    fi

    # Validate critical vars
    source "$ENV_FILE"
    local missing=0
    for var in SUPABASE_DB_HOST SUPABASE_DB_PASSWORD JWT_SECRET LLAMA_API_KEY; do
        val="${!var:-}"
        if [ -z "$val" ] || [[ "$val" == *"CHANGE-ME"* ]] || [[ "$val" == *"your-"* ]]; then
            err "$var is not configured!"
            missing=1
        fi
    done

    if [ "$missing" -eq 1 ]; then
        err "Fix the missing values in $REPO_DIR/$ENV_FILE and re-run this script."
        exit 1
    fi

    ok "Environment configured"
}

# ==========================================
# 4. Build and start
# ==========================================
build_and_start() {
    cd "$REPO_DIR"

    log "Building and starting services (this takes 5-15 minutes on first run)..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

    ok "Containers started"
}

# ==========================================
# 5. Wait for health checks
# ==========================================
wait_for_health() {
    log "Waiting for services to become healthy..."

    local services=("lms-eureka-server" "lms-user-service" "lms-learning-service" "lms-marketplace-service" "lms-ai-service" "lms-analytics-service" "lms-api-gateway" "lms-frontend")
    local max_wait=300
    local elapsed=0
    local interval=10

    while [ $elapsed -lt $max_wait ]; do
        local all_healthy=true
        for svc in "${services[@]}"; do
            local health
            health=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "missing")
            if [ "$health" != "healthy" ]; then
                all_healthy=false
                break
            fi
        done

        if $all_healthy; then
            ok "All services are healthy!"
            return
        fi

        sleep $interval
        elapsed=$((elapsed + interval))
        log "Still waiting... (${elapsed}s / ${max_wait}s)"
    done

    warn "Timed out waiting for all services. Checking status..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    echo ""
    warn "Some services may still be starting. Check logs with:"
    warn "  cd $REPO_DIR && docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
}

# ==========================================
# 6. Print summary
# ==========================================
print_summary() {
    local ip
    ip=$(curl -s -4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "  Frontend:     http://${ip}:3000"
    echo "  API Gateway:  http://${ip}:8080"
    echo "  Eureka:       http://${ip}:8761"
    echo ""
    echo "Useful commands:"
    echo "  cd $REPO_DIR"
    echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps          # status"
    echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f     # logs"
    echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down        # stop"
    echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --build  # rebuild"
    echo ""
}

# ==========================================
# Main
# ==========================================
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════╗"
    echo "║    LearnSystemUCU — Production Deployment        ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"

    if [ "$(id -u)" -ne 0 ]; then
        err "This script must be run as root (use sudo)"
        exit 1
    fi

    install_docker
    setup_repo
    setup_env
    build_and_start
    wait_for_health
    print_summary
}

main "$@"
