#!/bin/bash

##############################################################################
# LMS Spring Boot API Endpoint Testing Script
#
# This script tests all API endpoints for the LMS microservices:
# - User Service (Authentication, User Management)
# - Course Service (Courses, Modules, Resources)
# - Assessment Service (Quizzes, Assignments)
# - AI Service (Course Generation)
#
# Prerequisites:
# - Docker and Docker Compose installed
# - curl and jq installed (for JSON parsing)
#
# Usage:
#   ./test-api-endpoints.sh
##############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8080/api"
MAX_WAIT=120  # Maximum wait time in seconds
CHECK_INTERVAL=5  # Check interval in seconds

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Global variables for test data
ACCESS_TOKEN=""
USER_ID=""
COURSE_ID=""
MODULE_ID=""
QUIZ_ID=""
TEACHER_TOKEN=""
TEACHER_ID=""

##############################################################################
# Helper Functions
##############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local headers=$6

    log_info "Testing: $description"

    local cmd="curl -s -w '\n%{http_code}' -X $method"

    if [ -n "$headers" ]; then
        cmd="$cmd $headers"
    fi

    if [ -n "$data" ]; then
        cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
    fi

    cmd="$cmd '${BASE_URL}${endpoint}'"

    local response=$(eval $cmd)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_status" ]; then
        log_success "$description - Status: $http_code"
        echo "$body"
        return 0
    else
        log_error "$description - Expected: $expected_status, Got: $http_code"
        echo "Response: $body"
        return 1
    fi
}

# Wait for service to be healthy
wait_for_service() {
    local service_url=$1
    local service_name=$2
    local elapsed=0

    log_info "Waiting for $service_name to be ready..."

    while [ $elapsed -lt $MAX_WAIT ]; do
        if curl -s -f "$service_url" > /dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi

        sleep $CHECK_INTERVAL
        elapsed=$((elapsed + CHECK_INTERVAL))
        echo -n "."
    done

    log_error "$service_name failed to start within $MAX_WAIT seconds"
    return 1
}

##############################################################################
# Docker Compose Management
##############################################################################

start_services() {
    log_section "Starting Docker Compose Services"

    log_info "Stopping any existing containers..."
    docker-compose down -v 2>/dev/null || true

    log_info "Starting services..."
    docker-compose up -d

    # Wait for services to be healthy
    wait_for_service "http://localhost:8080/api/actuator/health" "Spring Boot Backend"

    # Give services a bit more time to fully initialize
    log_info "Waiting for services to fully initialize..."
    sleep 10
}

stop_services() {
    log_section "Stopping Services"
    log_info "Stopping Docker Compose services..."
    docker-compose down
}

##############################################################################
# Test Functions - Authentication & User Service
##############################################################################

test_auth_endpoints() {
    log_section "Testing Authentication Endpoints"

    # Test 1: Register a student user
    local student_email="teststudent$(date +%s)@ucu.edu.ua"
    local student_password="TestPass123"

    local register_data="{
        \"email\": \"$student_email\",
        \"password\": \"$student_password\",
        \"displayName\": \"Test Student\",
        \"firstName\": \"Test\",
        \"lastName\": \"Student\",
        \"role\": \"STUDENT\"
    }"

    local response=$(test_endpoint "POST" "/auth/register" 201 "Register student user" "$register_data")

    if [ $? -eq 0 ]; then
        USER_ID=$(echo "$response" | jq -r '.id // empty')
        log_info "Registered user ID: $USER_ID"
    fi

    # Test 2: Register a teacher user
    local teacher_email="testteacher$(date +%s)@ucu.edu.ua"
    local teacher_password="TeacherPass123"

    local teacher_register_data="{
        \"email\": \"$teacher_email\",
        \"password\": \"$teacher_password\",
        \"displayName\": \"Test Teacher\",
        \"firstName\": \"Test\",
        \"lastName\": \"Teacher\",
        \"role\": \"TEACHER\"
    }"

    local teacher_response=$(test_endpoint "POST" "/auth/register" 201 "Register teacher user" "$teacher_register_data")

    if [ $? -eq 0 ]; then
        TEACHER_ID=$(echo "$teacher_response" | jq -r '.id // empty')
        log_info "Registered teacher ID: $TEACHER_ID"
    fi

    # Test 3: Login with student credentials
    local login_data="{
        \"email\": \"$student_email\",
        \"password\": \"$student_password\"
    }"

    local login_response=$(test_endpoint "POST" "/auth/login" 200 "Login with student credentials" "$login_data")

    if [ $? -eq 0 ]; then
        ACCESS_TOKEN=$(echo "$login_response" | jq -r '.accessToken // empty')
        log_info "Obtained access token"
    fi

    # Test 4: Login with teacher credentials
    local teacher_login_data="{
        \"email\": \"$teacher_email\",
        \"password\": \"$teacher_password\"
    }"

    local teacher_login_response=$(test_endpoint "POST" "/auth/login" 200 "Login with teacher credentials" "$teacher_login_data")

    if [ $? -eq 0 ]; then
        TEACHER_TOKEN=$(echo "$teacher_login_response" | jq -r '.accessToken // empty')
        log_info "Obtained teacher access token"
    fi

    # Test 5: Login with invalid credentials (should fail)
    local invalid_login="{
        \"email\": \"$student_email\",
        \"password\": \"WrongPassword\"
    }"

    test_endpoint "POST" "/auth/login" 401 "Login with invalid credentials (should fail)" "$invalid_login"

    # Test 6: Register with invalid email (should fail)
    local invalid_email_data="{
        \"email\": \"invalid-email\",
        \"password\": \"$student_password\",
        \"displayName\": \"Test User\"
    }"

    test_endpoint "POST" "/auth/register" 400 "Register with invalid email (should fail)" "$invalid_email_data"
}

test_user_endpoints() {
    log_section "Testing User Management Endpoints"

    if [ -z "$ACCESS_TOKEN" ]; then
        log_warning "No access token available, skipping user tests"
        return
    fi

    # Test 1: Get current user profile
    test_endpoint "GET" "/users/me" 200 "Get current user profile" "" "-H 'Authorization: Bearer $ACCESS_TOKEN'"

    # Test 2: Update current user profile
    local update_data="{
        \"displayName\": \"Updated Test Student\",
        \"bio\": \"This is my bio\"
    }"

    test_endpoint "PUT" "/users/me" 200 "Update user profile" "$update_data" "-H 'Authorization: Bearer $ACCESS_TOKEN'"

    # Test 3: Get user by ID
    if [ -n "$USER_ID" ]; then
        test_endpoint "GET" "/users/$USER_ID" 200 "Get user by ID" "" "-H 'Authorization: Bearer $ACCESS_TOKEN'"
    fi

    # Test 4: Access without authentication (should fail)
    test_endpoint "GET" "/users/me" 401 "Get user without authentication (should fail)" "" ""
}

##############################################################################
# Test Functions - Course Service
##############################################################################

test_course_endpoints() {
    log_section "Testing Course Management Endpoints"

    if [ -z "$TEACHER_TOKEN" ]; then
        log_warning "No teacher token available, skipping course tests"
        return
    fi

    # Test 1: Get all courses
    test_endpoint "GET" "/courses?page=0&size=20" 200 "Get all courses" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"

    # Test 2: Create a new course
    local course_data="{
        \"code\": \"CS101\",
        \"titleUk\": \"Основи програмування\",
        \"titleEn\": \"Introduction to Programming\",
        \"descriptionEn\": \"A basic programming course\",
        \"visibility\": \"UNIVERSITY\",
        \"startDate\": \"2025-12-01\",
        \"endDate\": \"2026-03-01\",
        \"academicYear\": \"2025-2026\"
    }"

    local course_response=$(test_endpoint "POST" "/courses" 201 "Create a new course" "$course_data" "-H 'Authorization: Bearer $TEACHER_TOKEN'")

    if [ $? -eq 0 ]; then
        COURSE_ID=$(echo "$course_response" | jq -r '.id // empty')
        log_info "Created course ID: $COURSE_ID"
    fi

    # Test 3: Get course by ID
    if [ -n "$COURSE_ID" ]; then
        test_endpoint "GET" "/courses/$COURSE_ID" 200 "Get course by ID" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"
    fi

    # Test 4: Update course
    if [ -n "$COURSE_ID" ]; then
        local update_course_data="{
            \"code\": \"CS101\",
            \"titleUk\": \"Основи програмування (Оновлено)\",
            \"titleEn\": \"Introduction to Programming (Updated)\",
            \"descriptionEn\": \"An updated programming course\",
            \"visibility\": \"UNIVERSITY\"
        }"

        test_endpoint "PUT" "/courses/$COURSE_ID" 200 "Update course" "$update_course_data" "-H 'Authorization: Bearer $TEACHER_TOKEN'"
    fi

    # Test 5: Search courses
    test_endpoint "GET" "/courses/search?q=programming&page=0&size=20" 200 "Search courses" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"

    # Test 6: Get my courses
    test_endpoint "GET" "/courses/my?page=0&size=20" 200 "Get my courses" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"

    # Test 7: Get published courses
    test_endpoint "GET" "/courses/published?page=0&size=20" 200 "Get published courses" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"
}

test_module_endpoints() {
    log_section "Testing Module Management Endpoints"

    if [ -z "$COURSE_ID" ] || [ -z "$TEACHER_TOKEN" ]; then
        log_warning "No course ID or teacher token available, skipping module tests"
        return
    fi

    # Test 1: Create a module
    local module_data="{
        \"courseId\": \"$COURSE_ID\",
        \"titleUk\": \"Модуль 1\",
        \"titleEn\": \"Module 1\",
        \"descriptionEn\": \"First module\",
        \"orderIndex\": 1
    }"

    local module_response=$(test_endpoint "POST" "/modules" 201 "Create a module" "$module_data" "-H 'Authorization: Bearer $TEACHER_TOKEN'")

    if [ $? -eq 0 ]; then
        MODULE_ID=$(echo "$module_response" | jq -r '.id // empty')
        log_info "Created module ID: $MODULE_ID"
    fi

    # Test 2: Get modules by course
    test_endpoint "GET" "/modules/course/$COURSE_ID" 200 "Get modules by course" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"

    # Test 3: Get module by ID
    if [ -n "$MODULE_ID" ]; then
        test_endpoint "GET" "/modules/$MODULE_ID" 200 "Get module by ID" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"
    fi
}

##############################################################################
# Test Functions - Assessment Service
##############################################################################

test_quiz_endpoints() {
    log_section "Testing Quiz Management Endpoints"

    if [ -z "$COURSE_ID" ] || [ -z "$TEACHER_TOKEN" ]; then
        log_warning "No course ID or teacher token available, skipping quiz tests"
        return
    fi

    # Test 1: Create a quiz
    local create_response=$(test_endpoint "POST" "/quizzes?courseId=$COURSE_ID&title=Test%20Quiz&description=A%20test%20quiz" 201 "Create a quiz" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'")

    if [ $? -eq 0 ]; then
        QUIZ_ID=$(echo "$create_response" | jq -r '.id // empty')
        log_info "Created quiz ID: $QUIZ_ID"
    fi

    # Test 2: Get quizzes by course
    test_endpoint "GET" "/quizzes/course/$COURSE_ID?page=0&size=20" 200 "Get quizzes by course" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"

    # Test 3: Get quiz by ID
    if [ -n "$QUIZ_ID" ]; then
        test_endpoint "GET" "/quizzes/$QUIZ_ID" 200 "Get quiz by ID" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"
    fi

    # Test 4: Get quizzes list for course
    test_endpoint "GET" "/quizzes/course/$COURSE_ID/list" 200 "Get quizzes list for course" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"
}

test_assignment_endpoints() {
    log_section "Testing Assignment Management Endpoints"

    if [ -z "$COURSE_ID" ] || [ -z "$TEACHER_TOKEN" ]; then
        log_warning "No course ID or teacher token available, skipping assignment tests"
        return
    fi

    # Test 1: Get assignments by course
    test_endpoint "GET" "/assignments/course/$COURSE_ID?page=0&size=20" 200 "Get assignments by course" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"

    # Test 2: Get assignments list for course
    test_endpoint "GET" "/assignments/course/$COURSE_ID/list" 200 "Get assignments list for course" "" "-H 'Authorization: Bearer $TEACHER_TOKEN'"
}

##############################################################################
# Test Summary
##############################################################################

print_summary() {
    log_section "Test Summary"

    echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        log_success "All tests passed! 🎉"
        return 0
    else
        echo ""
        log_error "Some tests failed. Please review the output above."
        return 1
    fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║   LMS Spring Boot API Endpoint Testing Suite             ║"
    echo "║   Testing User, Course, Assessment & AI Services         ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed. Please install curl."
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. JSON parsing will be limited."
    fi

    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi

    # Start services
    start_services

    # Run all test suites
    test_auth_endpoints
    test_user_endpoints
    test_course_endpoints
    test_module_endpoints
    test_quiz_endpoints
    test_assignment_endpoints

    # Print summary
    print_summary
    local result=$?

    # Optionally stop services
    read -p "Do you want to stop the services? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        stop_services
    else
        log_info "Services are still running. Stop them manually with: docker-compose down"
    fi

    exit $result
}

# Run main function
main "$@"

