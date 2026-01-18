#!/bin/bash
# ==========================================
# LearnSystemUCU - Local Development Startup
# ==========================================
# This script starts all services for local development
# Usage: ./start-local-docker.sh

set -e

echo "🚀 Starting LearnSystemUCU Local Development Environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any running containers
echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.local.yml down --remove-orphans 2>/dev/null || true

# Start all services
echo "🔨 Building and starting all services..."
docker compose -f docker-compose.local.yml up --build -d

echo ""
echo "⏳ Waiting for services to be healthy (this may take 2-3 minutes)..."
sleep 30

# Check health of critical services
echo ""
echo "📊 Checking service status..."
docker ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "✅ Services started! Access points:"
echo "   - Frontend:     http://localhost:3000"
echo "   - API Gateway:  http://localhost:8080"
echo "   - Eureka:       http://localhost:8761"
echo "   - User Service: http://localhost:8081"
echo "   - AI Service:   http://localhost:8085"
echo ""
echo "📝 To view logs: docker compose -f docker-compose.local.yml logs -f [service-name]"
echo "🛑 To stop:      docker compose -f docker-compose.local.yml down"

