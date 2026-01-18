#!/bin/bash
# ==========================================
# LearnSystemUCU - Local Development Runner
# ==========================================
#
# Quick start script for running the entire project locally
#
# USAGE:
#   ./run-local.sh          # Start all services
#   ./run-local.sh build    # Force rebuild all images
#   ./run-local.sh stop     # Stop all services
#   ./run-local.sh clean    # Stop and remove all data
#   ./run-local.sh logs     # Show logs
#   ./run-local.sh status   # Show service status
#
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.yml"
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
    echo "║          LearnSystemUCU - Local Development              ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_env() {
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠ No .env file found. Creating from .env.local...${NC}"
        if [ -f ".env.local" ]; then
            cp .env.local .env
            echo -e "${GREEN}✓ Created .env file${NC}"
            echo -e "${YELLOW}⚠ Please edit .env and add your LLAMA_API_KEY${NC}"
        else
            echo -e "${RED}✗ No .env.local template found!${NC}"
            exit 1
        fi
    fi

    # Check if LLAMA_API_KEY is set
    if grep -q "LLAMA_API_KEY=your-" .env 2>/dev/null || grep -q "LLAMA_API_KEY=$" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠ LLAMA_API_KEY not configured in .env${NC}"
        echo -e "${YELLOW}  AI features will not work without an API key.${NC}"
        echo -e "${YELLOW}  Get a free key from: https://console.groq.com/keys${NC}"
        echo ""
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
        echo -e "${YELLOW}Building images (this may take 5-10 minutes first time)...${NC}"
        $COMPOSE_CMD -f $COMPOSE_FILE up --build -d
    else
        $COMPOSE_CMD -f $COMPOSE_FILE up -d
    fi

    echo ""
    echo -e "${GREEN}✓ Services starting!${NC}"
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo "  • Frontend:     http://localhost:3000"
    echo "  • API Gateway:  http://localhost:8080"
    echo "  • Eureka:       http://localhost:8761"
    echo "  • User API:     http://localhost:8081"
    echo "  • Course API:   http://localhost:8082"
    echo "  • AI API:       http://localhost:8085"
    echo ""
    echo -e "${YELLOW}Wait 2-3 minutes for all services to be healthy.${NC}"
    echo -e "${YELLOW}Run './run-local.sh status' to check service health.${NC}"
    echo -e "${YELLOW}Run './run-local.sh logs' to see logs.${NC}"
}

stop_services() {
    echo -e "${BLUE}Stopping all services...${NC}"
    $COMPOSE_CMD -f $COMPOSE_FILE down
    echo -e "${GREEN}✓ All services stopped${NC}"
}

clean_all() {
    echo -e "${RED}⚠ This will remove all containers AND data volumes!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Stopping and removing all containers and volumes...${NC}"
        $COMPOSE_CMD -f $COMPOSE_FILE down -v --remove-orphans
        echo -e "${GREEN}✓ All containers and data removed${NC}"
    else
        echo "Cancelled."
    fi
}

show_logs() {
    $COMPOSE_CMD -f $COMPOSE_FILE logs -f --tail=100
}

show_status() {
    echo -e "${BLUE}Service Status:${NC}"
    echo ""
    $COMPOSE_CMD -f $COMPOSE_FILE ps
    echo ""
    echo -e "${BLUE}Health Checks:${NC}"

    services=("postgres:5432" "redis:6379" "eureka-server:8761" "api-gateway:8080" "user-service:8081" "course-service:8082" "ai-service:8085" "frontend:3000")

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
        echo "  clean   - Stop and remove all data"
        echo "  logs    - Show service logs"
        echo "  status  - Show service status"
        echo "  restart - Restart all services"
        exit 1
        ;;
esac

