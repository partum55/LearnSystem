#!/bin/bash

# LMS System Startup Script with AI Integration
# This script starts all services including AI/Llama integration

set -e

echo "🚀 Starting LMS System with AI Integration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Function to wait for a service to be healthy
wait_for_service() {
    local service_name=$1
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"

    while [ $attempt -lt $max_attempts ]; do
        if docker ps | grep -q "$service_name.*healthy\|Up"; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    echo -e "${RED}❌ $service_name failed to start${NC}"
    return 1
}

# Parse command line arguments
WITH_AI=false
WITH_PYTHON=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --with-ai)
            WITH_AI=true
            shift
            ;;
        --with-python)
            WITH_PYTHON=true
            shift
            ;;
        --help)
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --with-ai       Start with AI service (Ollama + Llama)"
            echo "  --with-python   Start Python backend (Django)"
            echo "  --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./start.sh                    # Start basic system (Spring + Frontend)"
            echo "  ./start.sh --with-ai          # Start with AI integration"
            echo "  ./start.sh --with-python      # Start with Python backend"
            echo "  ./start.sh --with-ai --with-python  # Start everything"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help to see available options"
            exit 1
            ;;
    esac
done

# Build profiles
PROFILES=""
if [ "$WITH_AI" = true ]; then
    PROFILES="$PROFILES --profile ai"
fi
if [ "$WITH_PYTHON" = true ]; then
    PROFILES="$PROFILES --profile python"
fi

echo -e "${YELLOW}📦 Starting services...${NC}"
if [ "$WITH_AI" = true ]; then
    echo -e "${YELLOW}   Including: AI Service (Ollama + Llama 3.1)${NC}"
fi
if [ "$WITH_PYTHON" = true ]; then
    echo -e "${YELLOW}   Including: Python Backend (Django)${NC}"
fi
echo ""

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down 2>/dev/null || true

# Start services
echo -e "${YELLOW}🚀 Starting new containers...${NC}"
docker-compose up -d $PROFILES

echo ""
echo -e "${GREEN}✅ Services started!${NC}"
echo ""

# Wait for core services
wait_for_service "lms-postgres"
wait_for_service "lms-redis"
wait_for_service "lms-backend-spring"
wait_for_service "lms-frontend"

if [ "$WITH_AI" = true ]; then
    echo ""
    echo -e "${YELLOW}🤖 Checking AI configuration...${NC}"

    # Перевірити чи використовується Ollama
    if grep -q "ollama:11434" .env 2>/dev/null; then
        echo -e "${YELLOW}📥 Using Ollama (local model)${NC}"
        wait_for_service "lms-ollama"

        echo -e "${YELLOW}📥 Pulling Llama 3.1 model (this may take a few minutes)...${NC}"
        docker exec lms-ollama ollama pull llama3.1 || {
            echo -e "${YELLOW}⚠️  Failed to pull model. You may need to run: docker exec lms-ollama ollama pull llama3.1${NC}"
        }
    else
        echo -e "${GREEN}✅ Using cloud API (Groq/Together AI/etc.)${NC}"
        echo -e "${YELLOW}ℹ️  Make sure LLAMA_API_KEY is set in .env${NC}"
    fi

    wait_for_service "lms-ai-service"
fi

if [ "$WITH_PYTHON" = true ]; then
    wait_for_service "lms-backend-python"
fi

echo ""
echo -e "${GREEN}🎉 All services are running!${NC}"
echo ""
echo -e "${GREEN}📍 Service URLs:${NC}"
echo -e "   Frontend:      ${GREEN}http://localhost:3000${NC}"
echo -e "   Spring API:    ${GREEN}http://localhost:8080/api${NC}"

if [ "$WITH_AI" = true ]; then
    echo -e "   AI Service:    ${GREEN}http://localhost:8084/api${NC}"
    echo -e "   Ollama:        ${GREEN}http://localhost:11434${NC}"
fi

if [ "$WITH_PYTHON" = true ]; then
    echo -e "   Django API:    ${GREEN}http://localhost:8000/api${NC}"
fi

echo -e "   PostgreSQL:    ${GREEN}localhost:5432${NC}"
echo -e "   Redis:         ${GREEN}localhost:6379${NC}"
echo ""

# Display logs
echo -e "${YELLOW}📋 Viewing logs (Ctrl+C to stop, services will continue running)...${NC}"
echo ""
sleep 2
docker-compose logs -f

