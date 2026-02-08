# 🐳 Docker Deployment Guide

Complete guide for deploying the LMS system with Docker.

---

## 📋 Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space
- Groq API key (for AI service) - Get free at https://console.groq.com/keys

---

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Groq API key
nano .env  # or use your preferred editor
```

**Required Configuration in .env:**
```bash
LLAMA_API_KEY=your-groq-api-key-here
```

### Step 2: Deploy

```bash
# Build and start all services
docker-compose up -d --build
```

This will:
- ✅ Build all Docker images (5-10 minutes first time)
- ✅ Start all platform services
- ✅ Setup PostgreSQL database
- ✅ Setup Redis cache
- ✅ Configure networking

### Step 3: Verify

```bash
# Check service status
docker-compose ps

# Or check Eureka dashboard
open http://localhost:8761
```

Wait 2-3 minutes for all services to be healthy and registered with Eureka.

---

## 🌐 Access the Application

Once deployed:

**Main Application:**
- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost:8080/api

**Service Discovery:**
- **Eureka Dashboard:** http://localhost:8761

**Individual Microservices:**
- User Service: http://localhost:8081/api
- Learning Service: http://localhost:8089/api
- AI Service: http://localhost:8085/api
- Analytics Service: http://localhost:8088/api

**Databases:**
- PostgreSQL: localhost:5432
- Redis: localhost:6380

---

## 📁 Docker Files Overview

### New Docker Configuration Files

All old Docker files have been replaced with optimized versions:

```
LearnSystemUCU/
├── docker-compose.yml          # All services deployment
├── .env.example                # Environment template
├── run-local.sh                # Development runner script
├── backend-spring/
│   ├── Dockerfile              # Multi-stage backend build
│   └── .dockerignore
└── frontend/
    ├── Dockerfile              # Production (Nginx)
    ├── nginx.conf              # Nginx configuration
    └── .dockerignore
```

---

## 🔧 Configuration Details

### Environment Variables

**Database (.env):**
```bash
POSTGRES_DB=lms_db
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=your-secure-password
```

**Security (.env):**
```bash
JWT_SECRET=your-256-bit-secret-key-change-in-production
JWT_EXPIRATION=86400000  # 24 hours
```

**AI Service (.env):**
```bash
# Groq (Recommended - Free tier)
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_API_KEY=gsk_your_key_here
LLAMA_MODEL=llama-3.3-70b-versatile

# Alternative: Together AI
# LLAMA_API_URL=https://api.together.xyz/v1
# LLAMA_API_KEY=your-together-key
# LLAMA_MODEL=meta-llama/Llama-3-70b-chat-hf

# Alternative: OpenAI
# LLAMA_API_URL=https://api.openai.com/v1
# LLAMA_API_KEY=sk-your-openai-key
# LLAMA_MODEL=gpt-4
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_AI_SERVICE_URL=http://localhost:8080/api/ai
```

---

## 🎯 AI Service Setup

### Getting Groq API Key (FREE)

1. Visit https://console.groq.com/
2. Sign up for free account
3. Go to API Keys section
4. Create new API key
5. Copy key to `.env` file

**Free Tier:**
- ✅ 14,400 requests per day
- ✅ 30 requests per minute
- ✅ Perfect for development and small deployments

### Alternative AI Providers

**Together AI:**
- Sign up: https://together.ai/
- Free credits available
- Good for production

**OpenAI:**
- Sign up: https://platform.openai.com/
- Requires payment
- Best quality but expensive

---

## 📊 Service Architecture

```
                    Internet
                       |
                   Nginx (80)
                       |
                   Frontend
                       |
                  API Gateway (8080)
                       |
        ┌──────────────┼──────────────┐
        |              |              |
   Eureka (8761)   Services      Databases
        |              |              |
        └──────────────┼──────────────┘
                       |
        ┌──────────────┼──────────────┬──────────┐
        |              |              |          |
    User (8081)  Learning (8089)     AI       Analytics
        |              |            (8085)      (8088)
        |              |              |          |
        └──────────────┴──────────────┴──────────┘
                          PostgreSQL + Redis
```

---

## 🛠️ Common Operations

### Start Services

```bash
# Start all services
docker-compose up -d

# View logs while starting
docker-compose up

# Build and start (after code changes)
docker-compose up --build -d
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ai-service
docker-compose logs -f frontend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 ai-service
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart ai-service
docker-compose restart frontend
```

### Rebuild Services

```bash
# Rebuild all
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build ai-service

# Force rebuild (no cache)
docker-compose build --no-cache ai-service
docker-compose up -d ai-service
```

### Scale Services

```bash
# Scale user service to 3 instances
docker-compose up -d --scale user-service=3

# Scale AI service to 2 instances
docker-compose up -d --scale ai-service=2
```

### Execute Commands in Containers

```bash
# Access database
docker exec -it lms-postgres psql -U lms_user -d lms_db

# Access Redis
docker exec -it lms-redis redis-cli

# Shell access to service
docker exec -it lms-ai-service sh
```

---

## 🐛 Troubleshooting

### Services Not Starting

**Check logs:**
```bash
docker-compose logs ai-service
```

**Common issues:**
- Missing API key in .env
- Ports already in use
- Not enough memory
- Database connection failed

### AI Service Not Working

**1. Check API key is set:**
```bash
docker exec lms-ai-service env | grep LLAMA_API_KEY
```

**2. Test API connection:**
```bash
docker exec lms-ai-service curl -H "Authorization: Bearer $LLAMA_API_KEY" \
  https://api.groq.com/openai/v1/models
```

**3. Check AI service logs:**
```bash
docker-compose logs -f ai-service
```

### Database Issues

**Reset database:**
```bash
docker-compose down -v
docker-compose up -d
```

**Access database:**
```bash
docker exec -it lms-postgres psql -U lms_user -d lms_db
```

**Check database logs:**
```bash
docker-compose logs postgres
```

### Frontend Not Loading

**Check frontend logs:**
```bash
docker-compose logs frontend
```

**Rebuild frontend:**
```bash
docker-compose up -d --build frontend
```

**Check Nginx config:**
```bash
docker exec lms-frontend cat /etc/nginx/conf.d/default.conf
```

### Port Conflicts

**Find what's using a port:**
```bash
sudo lsof -i :8080  # Check port 8080
sudo lsof -i :3000  # Check port 3000
```

**Kill process:**
```bash
sudo kill -9 <PID>
```

**Change ports in docker-compose.yml:**
```yaml
ports:
  - "8081:8080"  # Map host 8081 to container 8080
```

### Out of Memory

**Check Docker stats:**
```bash
docker stats
```

**Increase Docker memory:**
- Docker Desktop → Settings → Resources → Memory
- Increase to 6GB or 8GB

**Reduce service memory:**
Edit docker-compose.yml:
```yaml
environment:
  - JAVA_OPTS=-Xmx256m -Xms128m  # Reduce from 512m
```

### Services Not Registering with Eureka

**Wait 1-2 minutes** - Services need time to register

**Check Eureka dashboard:**
http://localhost:8761

**Restart Eureka:**
```bash
docker-compose restart eureka-server
```

**Check service logs for connection errors:**
```bash
docker-compose logs user-service | grep -i eureka
```

---

## 🔒 Security Best Practices

### For Production Deployment:

**1. Change all secrets in .env:**
```bash
# Generate strong JWT secret
openssl rand -base64 64

# Use strong database password
openssl rand -base64 32
```

**2. Enable HTTPS:**
- Use reverse proxy (Nginx, Traefik)
- Get SSL certificate (Let's Encrypt)

**3. Secure database:**
```yaml
postgres:
  environment:
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # From .env
```

**4. Restrict network access:**
```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"  # Only localhost
```

**5. Regular updates:**
```bash
docker-compose pull
docker-compose up -d
```

---

## 📈 Performance Optimization

### Resource Limits

**Set memory limits in docker-compose.yml:**
```yaml
services:
  ai-service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Enable Caching

**Redis is already configured** for all services.

**Check Redis usage:**
```bash
docker exec lms-redis redis-cli INFO stats
docker exec lms-redis redis-cli DBSIZE
```

### Database Performance

**Connection pooling is already configured** (HikariCP).

**Monitor connections:**
```bash
docker exec lms-postgres psql -U lms_user -d lms_db \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 📊 Monitoring

### Docker Stats

```bash
# Real-time stats
docker stats

# Specific service
docker stats lms-ai-service
```

### Health Checks

```bash
# Check all health statuses
docker ps --format "table {{.Names}}\t{{.Status}}"

# Individual service health
curl http://localhost:8080/actuator/health
curl http://localhost:8085/api/actuator/health
```

### Prometheus Metrics

**Metrics endpoints available:**
```bash
# AI Service metrics
curl http://localhost:8085/api/actuator/prometheus

# User Service metrics
curl http://localhost:8081/api/actuator/prometheus
```

---

## 🧪 Testing the Deployment

### 1. Check Services are Up

```bash
docker-compose ps
```

### 2. Test API Gateway

```bash
curl http://localhost:8080/actuator/health
```

### 3. Test AI Service

```bash
# Health check
curl http://localhost:8085/api/actuator/health

# Test AI generation (requires authentication)
curl -X POST http://localhost:8080/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, AI!", "maxTokens": 100}'
```

### 4. Test Frontend

```bash
curl http://localhost:3000
```

### 5. Check Eureka Dashboard

Open http://localhost:8761 and verify all services are registered.

---

## 📦 Backup and Restore

### Backup Database

```bash
# Create backup
docker exec lms-postgres pg_dump -U lms_user lms_db > backup.sql

# With timestamp
docker exec lms-postgres pg_dump -U lms_user lms_db > \
  backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore Database

```bash
# Restore from backup
cat backup.sql | docker exec -i lms-postgres psql -U lms_user -d lms_db
```

### Backup Volumes

```bash
# Create volume backup
docker run --rm \
  -v learnsystemucu_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

---

## 🎓 Development Workflow

### Development Mode

**Use Docker for backend + local frontend dev server:**

```bash
# Start only database and backend services
docker-compose up -d postgres redis eureka-server user-service learning-service ai-service analytics-service api-gateway

# Start frontend in development mode
cd frontend
npm run dev
```

**Or run frontend locally:**
```bash
cd frontend
npm install
npm run dev
```

### Backend Development

**Run backend services in Docker, develop locally:**

```bash
# Start dependencies
docker-compose up -d postgres redis eureka-server

# Run service locally
cd backend-spring/lms-ai-service
mvn spring-boot:run
```

---

## 🔄 Updates and Maintenance

### Update Images

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

### Clean Up

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything (CAREFUL!)
docker system prune -a --volumes
```

---

## 📞 Support

### Useful Commands Quick Reference

```bash
# Deploy
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f [service]

# Restart
docker-compose restart [service]

# Stop
docker-compose down

# Clean restart
docker-compose down -v && docker-compose up -d
```

### Getting Help

**Check logs first:**
```bash
docker-compose logs --tail=100 [service-name]
```

**Check service health:**
```bash
docker ps
docker stats
```

**Verify configuration:**
```bash
docker-compose config
```

---

## ✅ Deployment Checklist

Before going to production:

- [ ] Set strong JWT_SECRET in .env
- [ ] Set strong database password
- [ ] Add Groq/AI API key
- [ ] Configure email settings (if needed)
- [ ] Test all services work
- [ ] Setup HTTPS/SSL
- [ ] Configure firewall
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Test backup/restore
- [ ] Document custom configurations
- [ ] Setup log aggregation

---

**Docker deployment is now ready!** 🚀

For issues, check logs and troubleshooting section above.
