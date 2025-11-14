#!/bin/bash

# API Endpoint Test Script for Spring Boot Services
# This script tests the major API endpoints after Docker Compose is running

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URLs
USER_SERVICE_URL="${USER_SERVICE_URL:-http://localhost:8081}"
COURSE_SERVICE_URL="${COURSE_SERVICE_URL:-http://localhost:8082}"
ASSESSMENT_SERVICE_URL="${ASSESSMENT_SERVICE_URL:-http://localhost:8083}"
AI_SERVICE_URL="${AI_SERVICE_URL:-http://localhost:8084}"

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name: $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name: $message"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local expected_status="${5:-200}"
    local headers="$6"

    echo -e "\n${YELLOW}Testing:${NC} $name"
    echo "  URL: $method $url"

    local cmd="curl -s -w '\n%{http_code}' -X $method"

    if [ -n "$headers" ]; then
        cmd="$cmd -H '$headers'"
    fi

    if [ -n "$data" ]; then
        cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
    fi

    cmd="$cmd $url"

    local response=$(eval $cmd 2>&1)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        print_result "$name" "PASS" "HTTP $http_code (expected $expected_status)"
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo "  Response: ${body:0:200}..."
        fi
    else
        print_result "$name" "FAIL" "HTTP $http_code (expected $expected_status)"
        echo "  Response: $body"
    fi
}

echo "========================================="
echo "Spring Boot API Endpoint Tests"
echo "========================================="
echo ""

# Check if services are running
echo -e "${YELLOW}Checking service availability...${NC}"

check_service() {
    local service_name="$1"
    local url="$2"

    if curl -s -o /dev/null -w "%{http_code}" "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service_name is running at $url"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name is NOT running at $url"
        return 1
    fi
}

# Warm up - wait for services
echo "Waiting for services to be ready..."
sleep 5

echo ""
echo "========================================="
echo "1. User Service Tests"
echo "========================================="

# Health check
test_endpoint "User Service Health" "$USER_SERVICE_URL/actuator/health" "GET" "" "200"

# Register a new user
REGISTER_DATA='{
  "email": "test_'$(date +%s)'@ucu.edu.ua",
  "password": "TestPass123",
  "displayName": "Test User",
  "firstName": "Test",
  "lastName": "User",
  "role": "STUDENT",
  "locale": "EN"
}'

test_endpoint "Register New User" "$USER_SERVICE_URL/auth/register" "POST" "$REGISTER_DATA" "201"

# Try to login (will fail without valid credentials)
LOGIN_DATA='{
  "email": "test@ucu.edu.ua",
  "password": "WrongPassword"
}'

test_endpoint "Login with Invalid Credentials" "$USER_SERVICE_URL/auth/login" "POST" "$LOGIN_DATA" "401"

echo ""
echo "========================================="
echo "2. Course Service Tests"
echo "========================================="

# Health check
test_endpoint "Course Service Health" "$COURSE_SERVICE_URL/actuator/health" "GET" "" "200"

# Get courses (may require authentication)
test_endpoint "Get All Courses" "$COURSE_SERVICE_URL/api/v1/courses" "GET" "" "200|401"

echo ""
echo "========================================="
echo "3. Assessment Service Tests"
echo "========================================="

# Health check
test_endpoint "Assessment Service Health" "$ASSESSMENT_SERVICE_URL/actuator/health" "GET" "" "200"

echo ""
echo "========================================="
echo "4. AI Service Tests"
echo "========================================="

# Health check
test_endpoint "AI Service Health" "$AI_SERVICE_URL/actuator/health" "GET" "" "200"

# Print summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi

