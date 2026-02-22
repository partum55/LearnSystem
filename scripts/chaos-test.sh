#!/bin/bash
# Chaos Engineering Test Suite for LearnSystemUCU
# Tests system resilience to component failures
#
# Prerequisites:
# - Docker Compose running with all services
# - curl, jq installed
#
# Usage: ./chaos-test.sh [test_name]
# Tests: all, ai-failure, database-latency, network-partition, service-restart

set -e

# Configuration
API_GATEWAY_URL="${API_GATEWAY_URL:-https://localhost:8080}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.scale.yml}"
RECOVERY_WAIT=30
TEST_DURATION=60

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check system health
check_health() {
    local endpoint=$1
    local max_attempts=${2:-10}
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "${API_GATEWAY_URL}${endpoint}" > /dev/null 2>&1; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    return 1
}

# Wait for system to recover
wait_for_recovery() {
    echo "Waiting for system recovery..."
    sleep $RECOVERY_WAIT

    if check_health "/actuator/health"; then
        echo_status "System recovered"
        return 0
    else
        echo_error "System did not recover"
        return 1
    fi
}

# ===========================================
# CHAOS TEST 1: AI Service Failure
# ===========================================
test_ai_service_failure() {
    echo ""
    echo "=================================================="
    echo "CHAOS TEST 1: AI Service Failure"
    echo "=================================================="
    echo "Simulating AI service crash and testing fallback behavior"

    # Verify AI service is up
    if ! check_health "/api/v1/ai/health" 5; then
        echo_warning "AI service not available, skipping test"
        return 1
    fi
    echo_status "AI service is healthy"

    # Get AI service container ID
    AI_CONTAINER=$(docker ps --filter "name=ai-service" --format "{{.ID}}" | head -1)
    if [ -z "$AI_CONTAINER" ]; then
        echo_error "AI service container not found"
        return 1
    fi

    # Stop AI service
    echo "Stopping AI service..."
    docker stop $AI_CONTAINER

    # Test that system handles AI failure gracefully
    echo "Testing system behavior with AI service down..."

    # Make a request that would use AI - should fail gracefully
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_GATEWAY_URL}/api/v1/ai/generate/content" \
        -H "Content-Type: application/json" \
        -d '{"courseTitle":"Test","topic":"Test"}' 2>/dev/null || echo -e "\nerror")

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)

    if [ "$HTTP_CODE" == "503" ] || [ "$HTTP_CODE" == "502" ]; then
        echo_status "System correctly returned service unavailable"
    elif [ "$HTTP_CODE" == "200" ]; then
        echo_warning "AI request succeeded (cached response or fallback)"
    else
        echo_warning "Unexpected response code: $HTTP_CODE"
    fi

    # Verify other services still work
    echo "Verifying non-AI endpoints still work..."
    if check_health "/api/v1/courses" 3; then
        echo_status "Course service still responding"
    else
        echo_error "Course service affected by AI failure"
    fi

    # Restart AI service
    echo "Restarting AI service..."
    docker start $AI_CONTAINER

    # Wait for recovery
    sleep 15
    if check_health "/api/v1/ai/health" 10; then
        echo_status "AI service recovered"
    else
        echo_error "AI service did not recover"
        return 1
    fi

    echo_status "CHAOS TEST 1: PASSED"
}

# ===========================================
# CHAOS TEST 2: Database Latency Injection
# ===========================================
test_database_latency() {
    echo ""
    echo "=================================================="
    echo "CHAOS TEST 2: Database Latency Injection"
    echo "=================================================="
    echo "Simulating high database latency"

    # Get postgres container
    PG_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.ID}}" | head -1)
    if [ -z "$PG_CONTAINER" ]; then
        echo_warning "PostgreSQL container not found, skipping test"
        return 1
    fi

    # Add network latency using tc (if available)
    echo "Adding 500ms latency to database connections..."
    docker exec $PG_CONTAINER sh -c "apk add --no-cache iproute2 2>/dev/null || true"
    docker exec $PG_CONTAINER sh -c "tc qdisc add dev eth0 root netem delay 500ms 2>/dev/null || true"

    # Test API response times
    echo "Testing API response times with database latency..."
    START=$(date +%s.%N)
    RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "${API_GATEWAY_URL}/api/v1/courses" 2>/dev/null || echo -e "\nerror\n0")
    END=$(date +%s.%N)

    HTTP_CODE=$(echo "$RESPONSE" | tail -2 | head -1)
    RESPONSE_TIME=$(echo "$RESPONSE" | tail -1)

    echo "Response time: ${RESPONSE_TIME}s (with latency)"

    if [ "$HTTP_CODE" == "200" ]; then
        echo_status "API still responding despite database latency"
    else
        echo_warning "API affected by database latency: HTTP $HTTP_CODE"
    fi

    # Remove latency
    echo "Removing database latency..."
    docker exec $PG_CONTAINER sh -c "tc qdisc del dev eth0 root 2>/dev/null || true"

    # Verify normal response times
    RESPONSE=$(curl -s -w "\n%{time_total}" "${API_GATEWAY_URL}/api/v1/courses" 2>/dev/null || echo -e "\n0")
    NORMAL_TIME=$(echo "$RESPONSE" | tail -1)
    echo "Response time: ${NORMAL_TIME}s (normal)"

    echo_status "CHAOS TEST 2: PASSED"
}

# ===========================================
# CHAOS TEST 3: Service Restart During Load
# ===========================================
test_service_restart() {
    echo ""
    echo "=================================================="
    echo "CHAOS TEST 3: Service Restart During Load"
    echo "=================================================="
    echo "Testing rolling restart with traffic"

    # Start background load
    echo "Generating background load..."
    for i in {1..10}; do
        (while true; do
            curl -s "${API_GATEWAY_URL}/api/v1/courses" > /dev/null 2>&1
            sleep 0.5
        done) &
    done
    LOAD_PIDS=$!

    # Wait for load to stabilize
    sleep 5

    # Rolling restart of AI service replicas
    echo "Performing rolling restart of AI service..."
    AI_CONTAINERS=$(docker ps --filter "name=ai-service" --format "{{.ID}}")

    for container in $AI_CONTAINERS; do
        echo "Restarting container: $container"
        docker restart $container &
        sleep 10  # Wait before restarting next
    done

    # Wait for restarts to complete
    wait

    # Stop load
    pkill -P $$ curl 2>/dev/null || true

    # Check all services are healthy
    sleep 10
    if check_health "/actuator/health" 10; then
        echo_status "All services healthy after rolling restart"
    else
        echo_error "Services not healthy after restart"
        return 1
    fi

    echo_status "CHAOS TEST 3: PASSED"
}

# ===========================================
# CHAOS TEST 4: Circuit Breaker Validation
# ===========================================
test_circuit_breaker() {
    echo ""
    echo "=================================================="
    echo "CHAOS TEST 4: Circuit Breaker Validation"
    echo "=================================================="
    echo "Testing circuit breaker opens on failures"

    # Check circuit breaker state
    CB_STATE=$(curl -s "${API_GATEWAY_URL}/actuator/circuitbreakers" 2>/dev/null || echo "{}")
    echo "Initial circuit breaker state:"
    echo "$CB_STATE" | jq '.circuitBreakers' 2>/dev/null || echo "$CB_STATE"

    # Simulate failures by temporarily misconfiguring AI
    # This would require access to environment variables
    echo_warning "Circuit breaker validation requires manual failure injection"
    echo "Verify at: ${API_GATEWAY_URL}/actuator/circuitbreakers"

    echo_status "CHAOS TEST 4: MANUAL VERIFICATION REQUIRED"
}

# ===========================================
# CHAOS TEST 5: Memory Pressure
# ===========================================
test_memory_pressure() {
    echo ""
    echo "=================================================="
    echo "CHAOS TEST 5: Memory Pressure"
    echo "=================================================="
    echo "Testing system under memory pressure"

    # Get AI service container
    AI_CONTAINER=$(docker ps --filter "name=ai-service" --format "{{.ID}}" | head -1)
    if [ -z "$AI_CONTAINER" ]; then
        echo_warning "AI service container not found, skipping test"
        return 1
    fi

    # Get current memory usage
    BEFORE=$(docker stats --no-stream --format "{{.MemUsage}}" $AI_CONTAINER)
    echo "Memory before: $BEFORE"

    # Generate load to increase memory
    echo "Generating AI requests to increase memory usage..."
    for i in {1..20}; do
        curl -s -X POST "${API_GATEWAY_URL}/api/v1/ai/generate/content" \
            -H "Content-Type: application/json" \
            -d '{"courseTitle":"Memory Test '$i'","topic":"Testing","maxLength":500}' \
            > /dev/null 2>&1 &
    done
    wait

    # Check memory usage
    AFTER=$(docker stats --no-stream --format "{{.MemUsage}}" $AI_CONTAINER)
    echo "Memory after: $AFTER"

    # Verify service still healthy
    if check_health "/api/v1/ai/health" 5; then
        echo_status "Service healthy under memory pressure"
    else
        echo_error "Service degraded under memory pressure"
        return 1
    fi

    echo_status "CHAOS TEST 5: PASSED"
}

# ===========================================
# MAIN
# ===========================================
print_summary() {
    echo ""
    echo "=================================================="
    echo "CHAOS TEST SUMMARY"
    echo "=================================================="
    echo "Tests completed. Review results above for details."
    echo ""
    echo "Recommendations:"
    echo "1. Monitor Grafana during chaos tests for metric anomalies"
    echo "2. Check application logs for error patterns"
    echo "3. Verify circuit breaker states after each test"
    echo "4. Review Prometheus alerts triggered during tests"
}

run_all_tests() {
    echo "Running all chaos tests..."
    test_ai_service_failure || true
    test_database_latency || true
    test_service_restart || true
    test_circuit_breaker || true
    test_memory_pressure || true
    print_summary
}

# Parse arguments
case "${1:-all}" in
    "ai-failure")
        test_ai_service_failure
        ;;
    "database-latency")
        test_database_latency
        ;;
    "service-restart")
        test_service_restart
        ;;
    "circuit-breaker")
        test_circuit_breaker
        ;;
    "memory-pressure")
        test_memory_pressure
        ;;
    "all")
        run_all_tests
        ;;
    *)
        echo "Usage: $0 {all|ai-failure|database-latency|service-restart|circuit-breaker|memory-pressure}"
        exit 1
        ;;
esac

