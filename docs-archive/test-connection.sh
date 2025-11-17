#!/bin/bash

# LMS System Connection Test Script
# Tests frontend-backend connectivity and AI service integration

set -e

echo "🔍 LMS System Connection Test"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test HTTP endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_code" ] || [ "$response" = "200" ] || [ "$response" = "302" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $response)"
        return 1
    fi
}

# Test results counter
total_tests=0
passed_tests=0

echo -e "${BLUE}1. Checking Docker containers...${NC}"
echo "================================"

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

# Check running containers
containers=(
    "lms-postgres:PostgreSQL Database"
    "lms-redis:Redis Cache"
    "lms-backend-spring:Spring Boot API"
    "lms-frontend:React Frontend"
)

for container_info in "${containers[@]}"; do
    IFS=':' read -r container_name container_label <<< "$container_info"
    total_tests=$((total_tests + 1))
    echo -n "  $container_label... "
    if docker ps | grep -q "$container_name"; then
        echo -e "${GREEN}✅ Running${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}❌ Not running${NC}"
    fi
done

# Check AI containers (optional)
echo ""
echo -e "${BLUE}2. Checking AI Services (optional)...${NC}"
echo "======================================"

ai_containers=(
    "lms-ollama:Ollama (Llama Server)"
    "lms-ai-service:AI Service"
)

ai_running=0
for container_info in "${ai_containers[@]}"; do
    IFS=':' read -r container_name container_label <<< "$container_info"
    echo -n "  $container_label... "
    if docker ps | grep -q "$container_name"; then
        echo -e "${GREEN}✅ Running${NC}"
        ai_running=$((ai_running + 1))
    else
        echo -e "${YELLOW}⚠️  Not running${NC} (use --with-ai flag)"
    fi
done

echo ""
echo -e "${BLUE}3. Testing Service Endpoints...${NC}"
echo "==============================="

# Test endpoints
endpoints=(
    "Frontend:http://localhost:3000:200"
    "Spring API Health:http://localhost:8080/actuator/health:200"
    "PostgreSQL:localhost:5432:tcp"
    "Redis:localhost:6379:tcp"
)

for endpoint_info in "${endpoints[@]}"; do
    IFS=':' read -r name url expected_code protocol <<< "$endpoint_info"
    total_tests=$((total_tests + 1))

    if [ "$protocol" = "tcp" ]; then
        echo -n "  $name... "
        if timeout 2 bash -c "echo > /dev/tcp/${url/localhost:/127.0.0.1/}" 2>/dev/null; then
            echo -e "${GREEN}✅ Accessible${NC}"
            passed_tests=$((passed_tests + 1))
        else
            echo -e "${RED}❌ Not accessible${NC}"
        fi
    else
        if test_endpoint "  $name" "$url" "$expected_code"; then
            passed_tests=$((passed_tests + 1))
        fi
    fi
done

# Test AI endpoints if AI is running
if [ $ai_running -gt 0 ]; then
    echo ""
    echo -e "${BLUE}4. Testing AI Service Endpoints...${NC}"
    echo "=================================="

    ai_endpoints=(
        "Ollama API:http://localhost:11434/api/version:200"
        "AI Service Health:http://localhost:8084/actuator/health:200"
    )

    for endpoint_info in "${ai_endpoints[@]}"; do
        IFS=':' read -r name url expected_code <<< "$endpoint_info"
        total_tests=$((total_tests + 1))
        if test_endpoint "  $name" "$url" "$expected_code"; then
            passed_tests=$((passed_tests + 1))
        fi
    done
fi

echo ""
echo -e "${BLUE}5. Testing Frontend-Backend Connection...${NC}"
echo "=========================================="

# Check frontend environment
echo -n "  Frontend API URL configuration... "
if [ -f "frontend/.env" ]; then
    api_url=$(grep REACT_APP_API_URL frontend/.env | cut -d'=' -f2)
    echo -e "${GREEN}✅ $api_url${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file${NC}"
fi

# Test CORS by checking if API accepts requests
total_tests=$((total_tests + 1))
echo -n "  API CORS configuration... "
cors_test=$(curl -s -X OPTIONS http://localhost:8080/api/courses/ \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" \
    -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")

if [ "$cors_test" = "200" ] || [ "$cors_test" = "204" ]; then
    echo -e "${GREEN}✅ OK${NC}"
    passed_tests=$((passed_tests + 1))
else
    echo -e "${YELLOW}⚠️  Might need configuration${NC}"
fi

echo ""
echo -e "${BLUE}6. System Information...${NC}"
echo "========================"

# Get system info
echo "  Docker version: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
echo "  Docker Compose version: $(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)"

# Memory usage
if command -v free &> /dev/null; then
    total_mem=$(free -h | awk '/^Mem:/ {print $2}')
    used_mem=$(free -h | awk '/^Mem:/ {print $3}')
    echo "  System Memory: $used_mem / $total_mem"
fi

# Disk usage
echo "  Disk usage: $(df -h . | awk 'NR==2 {print $5 " used"}')"

# Container resource usage
echo ""
echo "  Container Resource Usage:"
docker stats --no-stream --format "    {{.Name}}: CPU {{.CPUPerc}} | MEM {{.MemUsage}}" 2>/dev/null | head -n 10

echo ""
echo "=============================="
echo -e "${BLUE}Test Summary${NC}"
echo "=============================="
echo "  Total tests: $total_tests"
echo "  Passed: ${GREEN}$passed_tests${NC}"
echo "  Failed: ${RED}$((total_tests - passed_tests))${NC}"

if [ $ai_running -gt 0 ]; then
    echo ""
    echo -e "${GREEN}✅ AI Integration is ACTIVE${NC}"
else
    echo ""
    echo -e "${YELLOW}ℹ️  AI Integration is not running${NC}"
    echo "   To enable: ./start.sh --with-ai"
fi

echo ""
if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}🎉 All systems operational!${NC}"
    echo ""
    echo "📍 Access points:"
    echo "   • Frontend:     http://localhost:3000"
    echo "   • Spring API:   http://localhost:8080/api"
    echo "   • API Docs:     http://localhost:8080/swagger-ui.html"
    if [ $ai_running -gt 0 ]; then
        echo "   • AI Service:   http://localhost:8084/api"
        echo "   • Ollama:       http://localhost:11434"
    fi
    exit 0
else
    echo -e "${YELLOW}⚠️  Some services are not available${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "  1. Start services: ./start.sh"
    echo "  2. Check logs: docker-compose logs -f"
    echo "  3. Restart: docker-compose restart"
    exit 1
fi

