#!/bin/bash

##############################################################################
# LMS Spring Boot Test Runner
#
# This script runs all tests for the LMS microservices
#
# Usage:
#   ./run-tests.sh [unit|integration|all]
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Change to backend-spring directory
cd "$(dirname "$0")/backend-spring"

TEST_TYPE="${1:-all}"

case $TEST_TYPE in
    unit)
        log_section "Running Unit Tests Only"
        log_info "Executing: mvn clean test -DskipITs"
        mvn clean test -DskipITs
        ;;

    integration)
        log_section "Running Integration Tests Only"
        log_info "Executing: mvn clean verify -DskipUTs"
        log_info "Note: This will start Testcontainers (PostgreSQL, Redis)"
        mvn clean verify -DskipUTs
        ;;

    all)
        log_section "Running All Tests (Unit + Integration)"
        log_info "Executing: mvn clean verify"
        log_info "Note: This will start Testcontainers (PostgreSQL, Redis)"
        mvn clean verify
        ;;

    coverage)
        log_section "Running Tests with Coverage Report"
        log_info "Executing: mvn clean verify jacoco:report"
        mvn clean verify jacoco:report
        log_info "Coverage reports available in:"
        log_info "  - lms-user-service/target/site/jacoco/index.html"
        log_info "  - lms-course-service/target/site/jacoco/index.html"
        log_info "  - lms-assessment-service/target/site/jacoco/index.html"
        ;;

    service)
        SERVICE="${2}"
        if [ -z "$SERVICE" ]; then
            log_error "Please specify a service: user, course, assessment, or ai"
            exit 1
        fi

        log_section "Running Tests for lms-$SERVICE-service"
        cd "lms-$SERVICE-service"
        mvn clean test
        cd ..
        ;;

    *)
        log_error "Invalid test type: $TEST_TYPE"
        echo "Usage: $0 [unit|integration|all|coverage|service <name>]"
        echo ""
        echo "Options:"
        echo "  unit        - Run unit tests only (fast)"
        echo "  integration - Run integration tests only (uses Testcontainers)"
        echo "  all         - Run all tests (default)"
        echo "  coverage    - Run tests with coverage report"
        echo "  service     - Run tests for specific service (user|course|assessment|ai)"
        exit 1
        ;;
esac

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    log_success "All tests passed! 🎉"
else
    log_error "Tests failed. Please review the output above."
fi

exit $EXIT_CODE

