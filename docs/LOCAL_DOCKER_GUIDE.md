# Local Docker Development Guide

## Quick Start

### One Command Start

```bash
# First time setup
cp .env.example .env
# Edit .env and add your LLAMA_API_KEY (get from https://console.groq.com/keys)

# Start everything
./run-local.sh build
```

### After First Build

```bash
# Start services (uses cached images)
./run-local.sh

# Or with docker-compose directly
docker-compose up -d
```

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (localhost:3000)                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Frontend (React/Nginx) :3000                      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API Gateway (Spring) :8080                       │
│                          Routes requests                             │
└────────────┬─────────┬─────────┬─────────┬─────────┬────────────────┘
             │         │         │         │         │
             ▼         ▼         ▼         ▼         ▼
        ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
        │  User  │ │Learning│ │   AI   │ │Analytics│ │  Redis │
        │ :8081  │ │ :8089  │ │ :8085  │ │ :8088  │ │ :6379* │
        └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
            │          │          │          │          │
            └──────────┴──────────┴──────────┴──────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
             ┌────────────┐              ┌────────────┐
             │ PostgreSQL │              │   Redis    │
             │   :5432    │              │   :6379    │
             └────────────┘              └────────────┘
```

---

## Port Mapping

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| API Gateway | 8080 | http://localhost:8080 |
| Eureka Server | 8761 | http://localhost:8761 |
| User Service | 8081 | http://localhost:8081 |
| Learning Service | 8089 | http://localhost:8089 |
| AI Service | 8085 | http://localhost:8085 |
| Analytics Service | 8088 | http://localhost:8088 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 (internal) | not exposed on host by default |

---

## Commands

### Using run-local.sh (Recommended)

```bash
# Start all services
./run-local.sh

# Start with rebuild
./run-local.sh build

# Stop all services
./run-local.sh stop

# Show logs
./run-local.sh logs

# Check service health
./run-local.sh status

# Remove everything including data
./run-local.sh clean
```

### Using docker-compose directly

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up --build -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f ai-service

# Remove with volumes
docker-compose down -v
```

---

## Startup Order

Services start in dependency order:

1. **PostgreSQL & Redis** (infrastructure)
2. **Eureka Server** (service discovery)
3. **Backend Services** (user, course, assessment, gradebook, ai)
4. **API Gateway** (routing)
5. **Frontend** (UI)

Wait ~2-3 minutes for all services to be healthy after starting.

---

## Healthchecks

All services expose health endpoints:

```bash
# Check API Gateway
curl http://localhost:8080/actuator/health

# Check User Service
curl http://localhost:8081/api/actuator/health

# Check Learning + AI Service
curl http://localhost:8089/api/actuator/health
curl http://localhost:8085/api/actuator/health

# Check Frontend
curl http://localhost:3000/health

# Check Eureka Dashboard
open http://localhost:8761
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLAMA_API_KEY` | Groq/OpenAI API key | **Required** |
| `POSTGRES_PASSWORD` | Database password | lms_password_local |
| `JWT_SECRET` | JWT signing key | dev-secret-... |

### AI Provider Options

**Groq (Recommended - Free)**
```env
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_API_KEY=gsk_your_key_here
LLAMA_MODEL=llama-3.3-70b-versatile
```

**OpenAI**
```env
LLAMA_API_URL=https://api.openai.com/v1
LLAMA_API_KEY=sk-your_key_here
LLAMA_MODEL=gpt-4o-mini
```

---

## Troubleshooting

### Services not starting?

```bash
# Check which services are running
docker-compose ps

# Check logs for a specific service
docker-compose logs ai-service

# Restart a specific service
docker-compose restart ai-service
```

### Database issues?

```bash
# Connect to database
docker exec -it lms-postgres psql -U lms_user -d lms_db

# Reset database
docker-compose down -v
docker-compose up -d
```

### Build errors?

```bash
# Clean rebuild
docker-compose build --no-cache

# Prune old images
docker system prune -f
```

### Out of memory?

Reduce JVM memory in docker-compose.yml:
```yaml
- JAVA_OPTS=-Xmx256m -Xms128m
```

---

## Development Workflow

### Backend Changes

```bash
# Rebuild specific service
docker-compose up -d --build user-service

# Or rebuild all
docker-compose up -d --build
```

### Frontend Changes

Rebuild frontend after changes:
```bash
docker-compose up -d --build frontend
```

### Database Migrations

Migrations run automatically on service startup via Flyway.

---

## Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 6 GB | 8+ GB |
| CPU | 4 cores | 6+ cores |
| Disk | 10 GB | 20 GB |

---

## Files Overview

```
LearnSystemUCU/
├── docker-compose.yml          # All services
├── .env.example                # Env template
├── .env                        # Your local config
├── run-local.sh                # Helper script
│
├── frontend/
│   ├── Dockerfile              # Production build
│   └── nginx.conf              # Nginx config
│
└── backend-spring/
    ├── Dockerfile              # Production build
    └── lms-*/                  # Services
```
