# 🐳 Docker Setup - Quick Reference

## 📦 What's New

All Docker configuration has been **completely rewritten** for optimal performance, especially for the AI service.

### New Files Created:

✅ **Docker Configuration:**
- `docker-compose.yml` - Local container deployment
- `backend-spring/Dockerfile` - Optimized multi-stage build
- `frontend/Dockerfile` - Production with Nginx
- `frontend/nginx.conf` - Optimized Nginx config
- `.env.example` - Environment template

✅ **Helper Scripts:**
- `run-local.sh` - Start/stop local stack
- `create-admin.sh` - Create an admin account

✅ **Documentation:**
- `DOCKER_DEPLOYMENT_GUIDE.md` - Complete guide

---

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy and edit environment file
cp .env.example .env
nano .env  # Add your LLAMA_API_KEY
```

### 2. Deploy

```bash
# Build and deploy everything
docker-compose up -d --build
```

### 3. Wait & Verify

```bash
# Wait 2-3 minutes, then check status
docker-compose ps

# Smoke test
curl http://localhost:8080/actuator/health
```

### 4. Access

- **Frontend:** http://localhost:3000
- **API:** http://localhost:8080/api
- **Eureka:** http://localhost:8761

---

## 🎯 Key Features

### AI Service Optimization

The AI service has **special configuration** for proper operation:

✅ **Increased Memory:** 1GB heap (vs 512MB for other services)
✅ **Longer Startup:** 120s timeout (AI models need time)
✅ **API Integration:** Pre-configured for Groq (free tier)
✅ **Error Handling:** 3 retries with 2-minute timeout
✅ **Caching:** Redis integration for faster responses

### Multi-Stage Builds

All services use **optimized multi-stage builds**:
- ✅ Layer caching for dependencies
- ✅ Smaller final images (JRE only, no build tools)
- ✅ Non-root users for security
- ✅ Health checks for all services

### Network Architecture

```
Frontend (Nginx) ← Port 3000
    ↓
API Gateway ← Port 8080
    ↓
Service Discovery (Eureka) ← Port 8761
    ↓
Microservices Network (172.20.0.0/16)
    ↓
PostgreSQL + Redis
```

---

## 📋 Environment Variables

### Required (in .env):

```bash
# AI Service - REQUIRED for AI features
LLAMA_API_KEY=your-groq-api-key-here

# Database - Can use defaults for development
POSTGRES_DB=lms_db
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=lms_password

# Security - CHANGE IN PRODUCTION
JWT_SECRET=your-256-bit-secret-key
```

### Optional:

```bash
# Alternative AI providers
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_MODEL=llama-3.3-70b-versatile

# Email (disabled by default)
SPRING_MAIL_ENABLED=false
```

---

## 🛠️ Common Commands

### Start/Stop

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove data
docker-compose down -v
```

### Logs

```bash
# View all logs
docker-compose logs -f

# Specific service
docker-compose logs -f ai-service
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 ai-service
```

### Restart

```bash
# Restart all
docker-compose restart

# Restart specific
docker-compose restart ai-service
```

### Rebuild

```bash
# Rebuild all
docker-compose up -d --build

# Rebuild specific
docker-compose up -d --build ai-service

# Force rebuild (no cache)
docker-compose build --no-cache
```

---

## 🐛 Troubleshooting

### AI Service Not Working

**Check API key:**
```bash
docker exec lms-ai-service env | grep LLAMA_API_KEY
```

**Check logs:**
```bash
docker-compose logs -f ai-service
```

**Test API:**
```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.groq.com/openai/v1/models
```

### Services Not Starting

**Check status:**
```bash
docker-compose ps
```

**Check logs:**
```bash
docker-compose logs [service-name]
```

**Clean restart:**
```bash
docker-compose down -v
docker-compose up -d --build
```

### Port Conflicts

**Find what's using port:**
```bash
sudo lsof -i :8080  # or :3000, :5432, etc.
```

**Change ports in docker-compose.yml:**
```yaml
ports:
  - "8081:8080"  # Use 8081 on host instead
```

---

## 🔒 Security Notes

### Default Configuration (Development)

⚠️ **NOT for production use!**

The default configuration uses:
- Simple passwords
- Default JWT secret
- Open database port
- No HTTPS

### Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET (generate with `openssl rand -base64 64`)
- [ ] Use strong database password
- [ ] Restrict database port (only localhost)
- [ ] Enable HTTPS (use reverse proxy)
- [ ] Configure firewall
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review all .env variables

---

## 📊 Resource Usage

### Recommended Specs

**Minimum:**
- 4GB RAM
- 2 CPU cores
- 10GB disk space

**Recommended:**
- 8GB RAM
- 4 CPU cores
- 20GB disk space

### Per-Service Memory

- Eureka: 256-512MB
- API Gateway: 256-512MB
- User Service: 256-512MB
- Learning Service: 512-768MB
- **AI Service: 512MB-1GB** (needs more for ML)
- Analytics Service: 256-512MB
- PostgreSQL: 256-512MB
- Redis: 128-256MB
- Frontend: 64-128MB

**Total:** ~4-6GB

---

## 🎓 Development Mode

### Frontend Hot Reload

```bash
# Start backend services
docker-compose up -d postgres redis eureka-server user-service learning-service marketplace-service ai-service analytics-service api-gateway

# Start frontend with hot reload
cd frontend
npm run dev
```

Or run frontend locally:
```bash
cd frontend
npm install
npm run dev
```

### Backend Development

Run individual services:

```bash
# Start dependencies
docker-compose up -d postgres redis eureka-server

# Run service locally (example: AI service)
cd backend-spring/lms-ai-service
mvn spring-boot:run
```

---

## 📈 Monitoring

### Service Health

```bash
# Check all
docker-compose ps

# Individual health endpoints
curl http://localhost:8081/api/actuator/health
curl http://localhost:8089/api/actuator/health
curl http://localhost:8085/api/actuator/health
```

### Eureka Dashboard

Open http://localhost:8761 to see:
- Registered services
- Service instances
- Health status

### Docker Stats

```bash
# Real-time stats
docker stats

# Specific service
docker stats lms-ai-service
```

---

## 🔄 Updates

### Update Docker Images

```bash
# Pull latest base images
docker-compose pull

# Rebuild with latest
docker-compose up -d --build
```

### Clean Up

```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -f

# Remove unused volumes
docker volume prune -f

# Remove everything (CAREFUL!)
docker system prune -a --volumes -f
```

---

## 📞 Getting Help

### Check Logs First

```bash
docker-compose logs --tail=100 [service-name]
```

### Verify Configuration

```bash
# Check docker-compose is valid
docker-compose config

# Check environment variables
docker-compose config | grep LLAMA_API_KEY
```

### Common Issues

1. **Port already in use** → Change port in docker-compose.yml
2. **Out of memory** → Increase Docker memory limit
3. **AI service not working** → Check LLAMA_API_KEY in .env
4. **Database errors** → Run `docker-compose down -v` and restart
5. **Services not registered** → Wait 2-3 minutes, check Eureka

---

## ✅ What's Different from Old Setup

### Old Configuration Issues:
- ❌ Multiple inconsistent Dockerfiles
- ❌ No AI service optimization
- ❌ Missing health checks
- ❌ No resource limits
- ❌ Complex manual deployment
- ❌ No development mode

### New Configuration Features:
- ✅ Single optimized Dockerfile per stack
- ✅ AI service specially configured
- ✅ Health checks for all services
- ✅ Resource limits and JVM tuning
- ✅ One-command deployment
- ✅ Development mode with hot reload
- ✅ Comprehensive documentation
- ✅ Helper scripts for common tasks
- ✅ .dockerignore for faster builds
- ✅ Multi-stage builds for smaller images

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Access frontend at http://localhost:3000
2. ✅ Create admin account
3. ✅ Create test course
4. ✅ Test AI features (generate course content)
5. ✅ Test all microservices
6. ✅ Review logs for errors
7. ✅ Set up monitoring for production

---

**For detailed documentation, see:** `DOCKER_DEPLOYMENT_GUIDE.md`

**Ready to deploy!** 🚀
