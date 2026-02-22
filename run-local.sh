#!/bin/bash
# ==========================================
# LearnSystemUCU - Production Runner
# ==========================================
#
# Quick start script for the production stack.
# Database lives in Supabase — no local postgres container.
#
# USAGE:
#   ./run-local.sh          # Start all services
#   ./run-local.sh build    # Force rebuild all images
#   ./run-local.sh stop     # Stop all services
#   ./run-local.sh clean    # Stop and remove local volumes
#   ./run-local.sh logs     # Show logs
#   ./run-local.sh status   # Show service status
#
# Requires: .env.production (copy from .env.production.example)
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
ENV_FILE_EXAMPLE=".env.production.example"
COMPOSE_CMD="docker compose"

# Check for docker compose v2 or fall back to docker-compose
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo -e "${RED}✗ Docker Compose is not installed${NC}"
        exit 1
    fi
fi

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║          LearnSystemUCU - Production                     ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}⚠ No $ENV_FILE file found. Creating from $ENV_FILE_EXAMPLE...${NC}"
        if [ -f "$ENV_FILE_EXAMPLE" ]; then
            cp "$ENV_FILE_EXAMPLE" "$ENV_FILE"
            echo -e "${GREEN}✓ Created $ENV_FILE${NC}"
            echo -e "${RED}✗ Fill in ALL required values in $ENV_FILE before continuing.${NC}"
            echo -e "${YELLOW}  See DEPLOY.md Steps 1-4 for where to get each value.${NC}"
            exit 1
        else
            echo -e "${RED}✗ No $ENV_FILE_EXAMPLE template found!${NC}"
            exit 1
        fi
    fi

    # Warn about unconfigured Supabase credentials
    if grep -q "SUPABASE_DB_PASSWORD=your-" "$ENV_FILE" 2>/dev/null || \
       grep -q "SUPABASE_DB_USER=postgres.your-" "$ENV_FILE" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Supabase credentials look unconfigured in $ENV_FILE${NC}"
        echo -e "${YELLOW}  See DEPLOY.md Step 1 for setup instructions.${NC}"
        echo ""
    fi

    # Warn about unconfigured LLAMA_API_KEY
    if grep -q "LLAMA_API_KEY=your-" "$ENV_FILE" 2>/dev/null || \
       grep -q "^LLAMA_API_KEY=$" "$ENV_FILE" 2>/dev/null; then
        echo -e "${YELLOW}⚠ LLAMA_API_KEY not configured in $ENV_FILE${NC}"
        echo -e "${YELLOW}  AI features will not work. Get a free key: https://console.groq.com/keys${NC}"
        echo ""
    fi

    # Error on default JWT secret
    if grep -q "JWT_SECRET=CHANGE-ME" "$ENV_FILE" 2>/dev/null; then
        echo -e "${RED}✗ JWT_SECRET must be changed from the default in $ENV_FILE${NC}"
        echo -e "${YELLOW}  Generate one with: openssl rand -base64 64${NC}"
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker is not installed${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}✗ Docker daemon is not running${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Docker is ready${NC}"
}

start_services() {
    echo -e "${BLUE}Starting all services...${NC}"
    echo ""

    if [ "$1" == "build" ]; then
        echo -e "${YELLOW}Building images (10-20 minutes on first run)...${NC}"
        $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d
    else
        $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    fi

    echo ""
    echo -e "${GREEN}✓ Services starting!${NC}"
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo "  • Frontend:     http://localhost:3000"
    echo "  • API Gateway:  http://localhost:8080"
    echo "  • Eureka:       http://localhost:8761"
    echo ""
    echo -e "${YELLOW}Wait 3-5 minutes for all services to become healthy.${NC}"
    echo -e "${YELLOW}Run './run-local.sh status' to check service health.${NC}"
    echo -e "${YELLOW}Run './run-local.sh logs' to see logs.${NC}"
}

stop_services() {
    echo -e "${BLUE}Stopping all services...${NC}"
    $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE down
    echo -e "${GREEN}✓ All services stopped${NC}"
}

clean_all() {
    echo -e "${RED}⚠ This will remove all containers and local volumes (Redis cache, submission files).${NC}"
    echo -e "${YELLOW}  Database data is safe — it lives in Supabase, not locally.${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Stopping and removing all containers and local volumes...${NC}"
        $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE down -v --remove-orphans
        echo -e "${GREEN}✓ All containers and local volumes removed${NC}"
    else
        echo "Cancelled."
    fi
}

show_logs() {
    $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE logs -f --tail=100
}

show_status() {
    echo -e "${BLUE}Service Status:${NC}"
    echo ""
    $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE ps
    echo ""
    echo -e "${BLUE}Health Checks:${NC}"

    services=("redis:6380" "eureka-server:8761" "api-gateway:8080" "user-service:8081" "learning-service:8089" "ai-service:8085" "analytics-service:8088" "frontend:3000")

    for service in "${services[@]}"; do
        name="${service%%:*}"
        port="${service##*:}"

        if curl -s -f "http://localhost:$port/actuator/health" > /dev/null 2>&1 || \
           curl -s -f "http://localhost:$port/health" > /dev/null 2>&1 || \
           curl -s -f "http://localhost:$port" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $name (port $port)"
        else
            echo -e "  ${RED}✗${NC} $name (port $port)"
        fi
    done
}

# ==========================================
# Main
# ==========================================

print_banner
check_docker

case "${1:-}" in
    "build")
        check_env
        start_services "build"
        ;;
    "stop")
        stop_services
        ;;
    "clean")
        clean_all
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "restart")
        stop_services
        check_env
        start_services
        ;;
    ""|"start")
        check_env
        start_services
        ;;
    *)
        echo "Usage: $0 {start|build|stop|clean|logs|status|restart}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all services (default)"
        echo "  build   - Rebuild and start all services"
        echo "  stop    - Stop all services"
        echo "  clean   - Stop and remove local volumes (DB data safe in Supabase)"
        echo "  logs    - Show service logs"
        echo "  status  - Show service status"
        echo "  restart - Restart all services"
        exit 1
        ;;
esac
