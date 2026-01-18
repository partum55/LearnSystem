# Learning Management System (LMS)

## Project Status: ✅ PRODUCTION READY

A full-stack Learning Management System with Spring Boot microservices backend and React TypeScript frontend.

### 🚀 Quick Start

```bash
# Local development with Docker
./run-local.sh build

# Check service status
./run-local.sh status

# View logs
./run-local.sh logs

# Stop all services
./run-local.sh stop
```

### ✅ Features
- **User Service** - Authentication, authorization, user management
- **Course Service** - Course management, enrollment, modules, resources  
- **Assessment Service** - Quizzes, assignments, grading, submissions
- **Gradebook Service** - Grade management, analytics
- **Deadline Service** - Deadline tracking, notifications, workload management
- **AI Service** - AI-powered content generation, course creation
- **Analytics Service** - AI-powered analytics for teachers
- **API Gateway** - Unified API entry point with load balancing
- **Eureka Server** - Service discovery

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

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Java 21 (for local backend development)
- Maven 3.9+ (for local backend development)

## Development

### Docker (Recommended)

```bash
# Copy environment template
cp .env.local .env

# Edit .env and add your LLAMA_API_KEY (for AI features)
# Get a free key from: https://console.groq.com/keys

# Build and start all services
./run-local.sh build

# After first build, just use:
./run-local.sh
```

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8080 |
| Eureka Dashboard | http://localhost:8761 |
| User Service | http://localhost:8081 |
| Course Service | http://localhost:8082 |
| Assessment Service | http://localhost:8083 |
| Gradebook Service | http://localhost:8084 |
| AI Service | http://localhost:8085 |
| Deadline Service | http://localhost:8086 |
| Analytics Service | http://localhost:8088 |

### Health Checks

```bash
# Check all services
./run-local.sh status

# Manual health checks
curl http://localhost:8081/api/actuator/health  # User Service
curl http://localhost:8082/api/actuator/health  # Course Service
curl http://localhost:8085/api/actuator/health  # AI Service
```

## Documentation

| Document | Description |
|----------|-------------|
| [LOCAL_DOCKER_GUIDE.md](docs/LOCAL_DOCKER_GUIDE.md) | Local development setup |
| [DOCKER_DEPLOYMENT_GUIDE.md](docs/DOCKER_DEPLOYMENT_GUIDE.md) | Production deployment |
| [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) | Configuration reference |
| [OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md) | Operations guide |

## Project Structure

```
learn_system/
├── frontend/                 # React TypeScript frontend
├── backend-spring/           # Spring Boot microservices
│   ├── lms-common/           # Shared libraries
│   ├── lms-user-service/     # User management
│   ├── lms-course-service/   # Course management
│   ├── lms-assessment-service/ # Assessments
│   ├── lms-gradebook-service/  # Gradebook
│   ├── lms-deadline-service/   # Deadlines
│   ├── lms-ai-service/         # AI features
│   ├── lms-analytics-service/  # Analytics
│   ├── lms-api-gateway/        # API Gateway
│   └── lms-eureka-server/      # Service Discovery
├── e2e-tests/                # End-to-end tests
├── docs/                     # Documentation
├── docker-compose.yml        # Production compose
├── docker-compose.local.yml  # Local development compose
└── run-local.sh              # Development runner script
```

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

Key variables:
- `LLAMA_API_KEY` - API key for AI service (required for AI features)
- `JWT_SECRET` - JWT signing secret (auto-generated in development)
- `POSTGRES_PASSWORD` - Database password

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `cd frontend && npm test`
5. Build: `cd frontend && npm run build`
6. Submit a pull request

## License

[MIT License](LICENSE)

