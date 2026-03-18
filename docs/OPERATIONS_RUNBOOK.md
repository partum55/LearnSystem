# Operations Runbook - LearnSystemUCU

**Version:** 1.1  
**Last Updated:** February 8, 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Environment Configuration](#2-environment-configuration)
3. [Deployment Procedures](#3-deployment-procedures)
4. [Health Checks](#4-health-checks)
5. [Common Issues & Resolutions](#5-common-issues--resolutions)
6. [Scaling Procedures](#6-scaling-procedures)
7. [Backup & Recovery](#7-backup--recovery)
8. [Incident Response](#8-incident-response)

---

## 1. System Overview

### Architecture Summary

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Nginx/CDN │────▶│ API Gateway │
│   Browser   │     │  (Frontend) │     │   :8080     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
        ▼                               ▼                               ▼
┌───────────────┐               ┌───────────────┐               ┌───────────────┐
│ User Service  │               │Learning Service│              │  AI Service   │
│    :8081      │               │    :8089      │               │    :8085      │
└───────┬───────┘               └───────┬───────┘               └───────┬───────┘
        │                               │                               │
        └───────────────────────────────┴───────────────┬───────────────┘
                                                        ▼
                                               ┌───────────────┐
                                               │Analytics Svc  │
                                               │    :8088      │
                                               └───────┬───────┘
                                                       │
                                              ┌────────┴────────┐
                                              │                 │
                                         ┌────▼────┐      ┌────▼────┐
                                         │PostgreSQL│      │  Redis  │
                                         │  :5432   │      │  :6380* │
                                         └──────────┘      └─────────┘

* Host-mapped Redis port (container internal port remains 6379)
```

### Service Ports

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| Eureka Server | 8761 | /actuator/health |
| API Gateway | 8080 | /actuator/health |
| User Service | 8081 | /api/actuator/health |
| Learning Service | 8089 | /api/actuator/health |
| Marketplace Service | 8086 | /api/actuator/health |
| AI Service | 8085 | /api/actuator/health |
| Analytics Service | 8088 | /api/actuator/health |
| PostgreSQL | 5432 | - |
| Redis | 6380 (host) / 6379 (container) | PING |
| Prometheus | 9090 | /-/healthy |
| Grafana | 3000 | /api/health |

---

## 2. Environment Configuration

### Required Environment Variables

```bash
# Database
DB_URL=jdbc:postgresql://postgres:5432/lms_db
DB_USERNAME=lms_user
DB_PASSWORD=<secure_password>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<optional>

# AI Service
LLAMA_API_KEY=<groq_api_key>
OPENAI_API_KEY=<openai_api_key>  # Optional fallback

# Kafka (Optional)
KAFKA_ENABLED=false
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Eureka
EUREKA_URI=http://eureka-server:8761/eureka

# Frontend
REACT_APP_API_URL=/api
```

### Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development deployment |
| `k8s/*.yaml` | Kubernetes manifests |
| `prometheus.yml` | Metrics collection |
| `grafana/dashboards/*.json` | Dashboard definitions |

---

## 3. Deployment Procedures

### 3.1 Development Deployment

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f ai-service
```

### 3.2 Production Deployment (Docker Compose)

```bash
# Rebuild and restart with latest local code
docker-compose up -d --build

# Verify key endpoints
curl -f http://localhost:8080/actuator/health
curl -f http://localhost:8081/api/actuator/health
curl -f http://localhost:8089/api/actuator/health
```

### 3.3 Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=lms-ai-service

# Scale manually if needed
kubectl scale deployment lms-ai-service --replicas=5

# Check HPA
kubectl get hpa
```

### 3.4 Rolling Update

```bash
# Docker Compose
docker-compose up -d --no-deps --build ai-service

# Kubernetes
kubectl rollout restart deployment/lms-ai-service
kubectl rollout status deployment/lms-ai-service
```

### 3.5 Rollback

```bash
# Kubernetes
kubectl rollout undo deployment/lms-ai-service

# Docker Compose - use previous image tag
docker-compose up -d --no-deps ai-service
```

---

## 4. Health Checks

### 4.1 Quick Health Check Script

```bash
#!/bin/bash
declare -A ENDPOINTS=(
  ["api-gateway"]="http://localhost:8080/actuator/health"
  ["user-service"]="http://localhost:8081/api/actuator/health"
  ["learning-service"]="http://localhost:8089/api/actuator/health"
  ["marketplace-service"]="http://localhost:8086/api/actuator/health"
  ["ai-service"]="http://localhost:8085/api/actuator/health"
  ["analytics-service"]="http://localhost:8088/api/actuator/health"
)

for service in "${!ENDPOINTS[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${ENDPOINTS[$service]}")
  echo "$service: $status"
done
```

### 4.2 Prometheus Metrics

Access: http://localhost:9090

Key Queries:
```promql
# Service health
up{job="lms-services"}

# AI request rate
rate(ai_generation_total[5m])

# AI latency P95
histogram_quantile(0.95, rate(ai_generation_duration_seconds_bucket[5m]))

# Circuit breaker state
resilience4j_circuitbreaker_state
```

### 4.3 Grafana Dashboards

Access: http://localhost:3000 (admin/admin)

Dashboards:
- AI Service Dashboard
- System Overview (custom)

---

## 5. Common Issues & Resolutions

### 5.1 AI Service Returns 503

**Symptoms:** AI endpoints return HTTP 503, circuit breaker open

**Diagnosis:**
```bash
# Check circuit breaker state
curl http://localhost:8085/api/actuator/circuitbreakers | jq

# Check AI service logs
docker logs lms-ai-service --tail 100

# Check Groq API status
curl -H "Authorization: Bearer $LLAMA_API_KEY" https://api.groq.com/openai/v1/models
```

**Resolution:**
1. If circuit breaker open, wait for half-open state (30s default)
2. If API key invalid, update `LLAMA_API_KEY` and restart
3. If Groq down, check OpenAI fallback is configured

### 5.2 High Memory Usage

**Symptoms:** OOMKilled containers, slow response times

**Diagnosis:**
```bash
# Check container stats
docker stats

# Check JVM heap
curl http://localhost:8085/api/actuator/metrics/jvm.memory.used | jq
```

**Resolution:**
1. Increase container memory limits
2. Adjust JVM settings: `-Xmx512m -Xms256m`
3. Check for memory leaks in recent deployments

### 5.3 Database Connection Pool Exhausted

**Symptoms:** "Connection pool exhausted" errors

**Diagnosis:**
```bash
# Check active connections
docker exec lms-postgres psql -U lms_user -c "SELECT count(*) FROM pg_stat_activity;"

# Check HikariCP metrics
curl http://localhost:8085/api/actuator/metrics/hikaricp.connections.active | jq
```

**Resolution:**
1. Increase pool size in `application.yml`:
   ```yaml
   spring.datasource.hikari.maximum-pool-size: 20
   ```
2. Check for connection leaks (unclosed connections)
3. Add connection timeout: `connection-timeout: 30000`

### 5.4 Redis Connection Failures

**Symptoms:** Cache misses, rate limiting failures

**Diagnosis:**
```bash
# Check Redis connectivity
docker exec lms-redis redis-cli PING

# Check memory
docker exec lms-redis redis-cli INFO memory
```

**Resolution:**
1. Restart Redis: `docker restart redis`
2. Check maxmemory policy
3. Verify network connectivity

### 5.5 Eureka Registration Issues

**Symptoms:** Services not visible in Eureka, load balancing fails

**Diagnosis:**
```bash
# Check Eureka dashboard
curl http://localhost:8761/eureka/apps | jq

# Check service registration
curl http://localhost:8085/api/actuator/health | jq '.components.discoveryComposite'
```

**Resolution:**
1. Restart affected service
2. Check `eureka.client.serviceUrl.defaultZone` configuration
3. Verify network between services

---

## 6. Scaling Procedures

### 6.1 Horizontal Scaling

```bash
# Docker Compose
docker-compose up -d --scale ai-service=3

# Kubernetes
kubectl scale deployment lms-ai-service --replicas=5
```

### 6.2 Auto-scaling (Kubernetes)

HPA is configured for:
- CPU utilization > 70%
- Memory utilization > 80%

```bash
# Check HPA status
kubectl get hpa lms-ai-service-hpa

# Describe for events
kubectl describe hpa lms-ai-service-hpa
```

### 6.3 Database Scaling

PostgreSQL read replicas (future):
1. Create replica instance
2. Configure streaming replication
3. Update services to use read replica for queries

---

## 7. Backup & Recovery

### 7.1 Database Backup

```bash
# Full backup
docker exec lms-postgres pg_dump -U lms_user lms_db > backup_$(date +%Y%m%d).sql

# Compressed backup
docker exec lms-postgres pg_dump -U lms_user lms_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 7.2 Database Restore

```bash
# Stop services
docker-compose stop user-service learning-service marketplace-service ai-service analytics-service api-gateway

# Restore
gunzip -c backup_20251219.sql.gz | docker exec -i lms-postgres psql -U lms_user lms_db

# Restart services
docker-compose start user-service learning-service marketplace-service ai-service analytics-service api-gateway
```

### 7.3 Redis Backup

```bash
# Trigger RDB save
docker exec lms-redis redis-cli BGSAVE

# Copy dump file
docker cp lms-redis:/data/dump.rdb ./redis_backup.rdb
```

---

## 8. Incident Response

### 8.1 Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 | System down | 15 min | All services unreachable |
| P2 | Major feature broken | 1 hour | AI generation fails |
| P3 | Minor feature broken | 4 hours | Caching not working |
| P4 | Cosmetic/minor | 24 hours | UI glitch |

### 8.2 Incident Checklist

1. **Identify:** Check Grafana alerts, Prometheus queries
2. **Communicate:** Update status page, notify stakeholders
3. **Diagnose:** Follow runbook for specific error
4. **Resolve:** Apply fix, deploy if needed
5. **Verify:** Confirm services healthy
6. **Document:** Create incident report

### 8.3 Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-call Engineer | Slack: #ops-alerts | - |
| Platform Lead | - | After 30 min P1 |
| Principal Architect | - | After 1 hour P1 |

### 8.4 Post-Incident Review

Template for post-mortem:
1. **Summary:** What happened?
2. **Timeline:** Sequence of events
3. **Root Cause:** Why did it happen?
4. **Resolution:** How was it fixed?
5. **Action Items:** What will prevent recurrence?

---

## Appendix: Useful Commands

```bash
# View all container logs
docker-compose logs -f

# Enter container shell
docker exec -it lms-ai-service /bin/sh

# Check Kafka topics
docker exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092

# Force garbage collection (JVM)
curl -X POST http://localhost:8085/api/actuator/gc

# Thread dump
curl http://localhost:8085/api/actuator/threaddump > threaddump.json
```
