#!/bin/bash

# Quick Start Script for LMS User Service (Development Mode)
# This runs the service with H2 in-memory database (no PostgreSQL or Redis needed)

echo "=========================================="
echo "Starting LMS User Service (Dev Mode)"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Set development profile
export SPRING_PROFILES_ACTIVE=dev

echo "Configuration:"
echo "  Profile: dev"
echo "  Database: H2 in-memory"
echo "  Port: 8080"
echo "  Context: /api"
echo "  Redis: Optional (fallback to in-memory)"
echo ""

echo "Building project..."
mvn clean install -DskipTests -q

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✓ Build successful"
echo ""

echo "Starting service..."
echo "Access at: http://localhost:8080/api"
echo "H2 Console: http://localhost:8080/api/h2-console"
echo "Health Check: http://localhost:8080/api/actuator/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

mvn spring-boot:run -pl lms-user-service


