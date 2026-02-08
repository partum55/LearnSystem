# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Learning Management System with:
- **Backend**: Spring Boot microservices architecture with 8 services
- **Frontend**: React + TypeScript with Tailwind CSS
- **Infrastructure**: Docker-based development and deployment

## Architecture

```
┌─────────────────┐
│   Frontend      │
│ (React + TS)    │
│  :3000          │
└────────┬────────┘
         │
┌────────▼────────┐
│   API Gateway   │
│     :8080       │
└────────┬────────┘
         │
    ┌────┴────┬────────────┬────────────┬────────────┐
    ▼         ▼            ▼            ▼            ▼
┌────────┐ ┌──────┐  ┌──────────┐  ┌──────────┐ ┌──────────┐
│  User  │ │Course│  │Assessment│  │Gradebook │ │    AI    │
│Service │ │Service│ │Service   │  │Service   │ │Service   │
│:8081   │ │:8082  │ │:8083     │  │:8084     │ │:8085     │
└────────┘ └──────┘  └──────────┘  └──────────┘ └──────────┘
     │         │           │             │            │
     └─────────┴───────────┴─────────────┴────────────┘
                          │
                ┌─────────┴─────────┐
                │   PostgreSQL      │
                │   Redis Cache     │
                └───────────────────┘
```

## Common Development Commands

### Quick Start
```bash
# First time setup
cp .env.local .env
# Edit .env and add your LLAMA_API_KEY (get from https://console.groq.com/keys)

# Start everything
./run-local.sh build

# After first build, just use:
./run-local.sh
```

### Service Management
```bash
# Check service status
./run-local.sh status

# View logs
./run-local.sh logs

# Stop all services
./run-local.sh stop

# Clean everything including data
./run-local.sh clean
```

### Backend Development (Local)
```bash
# Navigate to backend directory
cd backend-spring

# Build all services
mvn clean install

# Run a specific service (from its directory)
mvn spring-boot:run
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Docker Development
```bash
# Start with docker-compose
docker-compose up -d

# Start with rebuild
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Code Structure

### Backend (Spring Boot Microservices)
- `lms-user-service`: Authentication, authorization, user management (:8081)
- `lms-learning-service`: Course, assessment, gradebook, submission, and deadline management (:8089)
- `lms-ai-service`: AI-powered content generation (:8085)
- `lms-analytics-service`: Teacher analytics (:8088)
- `lms-api-gateway`: Unified API entry point (:8080)
- `lms-eureka-server`: Service discovery (:8761)
- `lms-common`: Shared libraries

### Frontend (React + TypeScript)
- Component-based architecture with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- React Query for server state management
- Monaco Editor integration for code editing

## Testing

### Frontend Testing
```bash
cd frontend
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
```

### Backend Testing
```bash
cd backend-spring
mvn test               # Run unit tests
mvn verify             # Run integration tests
```

## Environment Setup

1. **Prerequisites**:
   - Docker & Docker Compose
   - Node.js 18+
   - Java 21
   - Maven 3.9+

2. **Environment Variables**:
   - Copy `.env.local` to `.env`
   - Configure `LLAMA_API_KEY` for AI features
   - Set database passwords and JWT secrets

## Key URLs for Local Development

- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080
- Eureka Dashboard: http://localhost:8761
- Individual Services: http://localhost:8081-8088

## Health Checks

```bash
# Check all services
./run-local.sh status

# Manual health checks
curl http://localhost:8081/api/actuator/health  # User Service
curl http://localhost:8082/api/actuator/health  # Course Service
curl http://localhost:8085/api/actuator/health  # AI Service
```
