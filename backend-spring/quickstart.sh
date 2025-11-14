#!/bin/bash
# Quick Start Script for LMS Spring Boot Backend
# Usage: ./quickstart.sh [build|run|test|docker|clean]

set -e

PROJECT_ROOT="/home/parum/IdeaProjects/LearnSystemUCU"
BACKEND_DIR="$PROJECT_ROOT/backend-spring"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   LMS Spring Boot Migration - Quick Start${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check Java
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
        if [ "$JAVA_VERSION" -ge 21 ]; then
            echo -e "${GREEN}✓ Java $JAVA_VERSION found${NC}"
        else
            echo -e "${RED}✗ Java 21 or higher required (found Java $JAVA_VERSION)${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Java not found. Please install Java 21 or higher${NC}"
        exit 1
    fi

    # Check Maven
    if command -v mvn &> /dev/null; then
        MVN_VERSION=$(mvn -version | head -n 1 | awk '{print $3}')
        echo -e "${GREEN}✓ Maven $MVN_VERSION found${NC}"
    else
        echo -e "${RED}✗ Maven not found. Please install Maven 3.9+${NC}"
        exit 1
    fi

    # Check Docker
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker found${NC}"
    else
        echo -e "${YELLOW}⚠ Docker not found. Docker deployment will not be available${NC}"
    fi

    echo ""
}

# Build the project
build() {
    echo -e "${YELLOW}Building the project...${NC}"
    cd "$BACKEND_DIR"
    mvn clean package -DskipTests
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
    echo -e "${BLUE}JAR location: $BACKEND_DIR/lms-user-service/target/lms-user-service-1.0.0-SNAPSHOT.jar${NC}"
    echo ""
}

# Run the application locally
run() {
    echo -e "${YELLOW}Starting LMS User Service...${NC}"
    cd "$BACKEND_DIR"

    # Check if JAR exists
    JAR_FILE="$BACKEND_DIR/lms-user-service/target/lms-user-service-1.0.0-SNAPSHOT.jar"
    if [ ! -f "$JAR_FILE" ]; then
        echo -e "${YELLOW}JAR not found. Building first...${NC}"
        build
    fi

    echo -e "${GREEN}Starting application on port 8080...${NC}"
    java -jar "$JAR_FILE"
}

# Run with Maven
run_maven() {
    echo -e "${YELLOW}Starting LMS User Service with Maven...${NC}"
    cd "$BACKEND_DIR/lms-user-service"
    mvn spring-boot:run
}

# Run tests
test() {
    echo -e "${YELLOW}Running tests...${NC}"
    cd "$BACKEND_DIR"
    mvn test
    echo -e "${GREEN}✓ Tests completed!${NC}"
    echo ""
}

# Run with Docker Compose
docker_run() {
    echo -e "${YELLOW}Starting services with Docker Compose...${NC}"
    cd "$PROJECT_ROOT"

    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${GREEN}✓ .env file created. Please review and update it.${NC}"
        else
            echo -e "${RED}✗ .env.example not found${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}Starting PostgreSQL, Redis, and Spring Boot backend...${NC}"
    docker-compose up -d postgres redis backend-spring

    echo ""
    echo -e "${GREEN}✓ Services started!${NC}"
    echo -e "${BLUE}View logs: docker-compose logs -f backend-spring${NC}"
    echo -e "${BLUE}Health check: curl http://localhost:8080/api/actuator/health${NC}"
    echo ""
}

# Clean the project
clean() {
    echo -e "${YELLOW}Cleaning the project...${NC}"
    cd "$BACKEND_DIR"
    mvn clean
    echo -e "${GREEN}✓ Clean completed!${NC}"
    echo ""
}

# Show status
status() {
    echo -e "${YELLOW}Checking service status...${NC}"

    # Check if Spring Boot is running
    if curl -s http://localhost:8080/api/actuator/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Spring Boot User Service is running${NC}"
        curl -s http://localhost:8080/api/actuator/health | python3 -m json.tool 2>/dev/null || cat
    else
        echo -e "${RED}✗ Spring Boot User Service is not running${NC}"
    fi

    echo ""

    # Check Docker containers
    if command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker containers:${NC}"
        docker-compose ps 2>/dev/null || echo "No containers running"
    fi

    echo ""
}

# Show help
show_help() {
    echo "Usage: ./quickstart.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build         - Build the project with Maven"
    echo "  run           - Run the application from JAR"
    echo "  run-maven     - Run the application with Maven"
    echo "  test          - Run tests"
    echo "  docker        - Start with Docker Compose"
    echo "  clean         - Clean build artifacts"
    echo "  status        - Check service status"
    echo "  help          - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./quickstart.sh build"
    echo "  ./quickstart.sh docker"
    echo "  ./quickstart.sh run"
    echo ""
}

# Main script logic
main() {
    check_prerequisites

    case "${1:-help}" in
        build)
            build
            ;;
        run)
            run
            ;;
        run-maven)
            run_maven
            ;;
        test)
            test
            ;;
        docker)
            docker_run
            ;;
        clean)
            clean
            ;;
        status)
            status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"

