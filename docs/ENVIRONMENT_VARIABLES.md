# Environment Variables Reference

Complete reference for all environment variables used in LearnSystemUCU.

---

## Core Services

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_URL` | Yes | `jdbc:postgresql://localhost:5432/lms_db` | JDBC connection URL |
| `DB_USERNAME` | Yes | `lms_user` | Database username |
| `DB_PASSWORD` | Yes | `lms_password` | Database password |

### Redis Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | No | `localhost` | Redis server hostname |
| `REDIS_PORT` | No | `6379` | Redis server port |
| `REDIS_PASSWORD` | No | `` | Redis password (if auth enabled) |

### Service Discovery

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EUREKA_URI` | No | `http://localhost:8761/eureka` | Eureka server URL |

---

## AI Service Configuration

### LLM Provider - Groq (Primary)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLAMA_API_KEY` | Yes | `` | Groq API key for LLM access |
| `LLAMA_API_URL` | No | `https://api.groq.com/openai/v1` | Groq API base URL |
| `LLAMA_MODEL` | No | `llama-3.3-70b-versatile` | Model to use |

### LLM Provider - OpenAI (Fallback)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | `` | OpenAI API key (enables fallback) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model to use |

### AI Caching

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_CACHE_ENABLED` | No | `true` | Enable Redis caching for AI |
| `AI_CACHE_TTL_MINUTES` | No | `60` | Cache TTL in minutes |
| `AI_CACHE_MAX_TOKENS` | No | `8000` | Max tokens for cached responses |

### AI Pricing & Limits

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PRICING_PROMPT` | No | `0.05` | Cost per million prompt tokens |
| `AI_PRICING_COMPLETION` | No | `0.10` | Cost per million completion tokens |
| `AI_MONTHLY_TOKEN_LIMIT` | No | `1000000` | Monthly token limit per user |

---

## Kafka Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KAFKA_ENABLED` | No | `false` | Enable Kafka event publishing |
| `KAFKA_BOOTSTRAP_SERVERS` | No | `localhost:9092` | Kafka broker addresses |

---

## API Gateway Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GATEWAY_RATE_LIMIT_REPLENISH` | No | `10` | Requests per second |
| `GATEWAY_RATE_LIMIT_BURST` | No | `20` | Burst capacity |

---

## Frontend Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_API_URL` | No | `` | Backend API base URL |
| `REACT_APP_AI_SERVICE_URL` | No | `` | AI service URL (deprecated) |
| `GENERATE_SOURCEMAP` | No | `true` | Generate source maps |

---

## Monitoring Configuration

### Prometheus

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROMETHEUS_URL` | No | `http://prometheus:9090` | Prometheus server URL |

### Grafana

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GF_SECURITY_ADMIN_USER` | No | `admin` | Grafana admin username |
| `GF_SECURITY_ADMIN_PASSWORD` | No | `admin` | Grafana admin password |
| `GF_USERS_ALLOW_SIGN_UP` | No | `false` | Allow user registration |

---

## Spring Profiles

| Variable | Values | Description |
|----------|--------|-------------|
| `SPRING_PROFILES_ACTIVE` | `dev`, `docker`, `production` | Active Spring profile |

### Profile-Specific Behavior

- **dev**: Debug logging, H2 console, no rate limiting
- **docker**: Docker-friendly defaults, service discovery
- **production**: Optimized settings, minimal logging, full security

---

## Docker Compose Environment

Example `.env` file:

```bash
# Database
DB_PASSWORD=secure_password_here

# AI
LLAMA_API_KEY=gsk_your_groq_api_key_here
OPENAI_API_KEY=sk-your_openai_key_here

# Monitoring
GRAFANA_PASSWORD=secure_grafana_password

# Kafka (optional)
KAFKA_ENABLED=false
```

---

## Kubernetes Secrets

Create secrets:

```bash
kubectl create secret generic lms-secrets \
  --from-literal=db-url=jdbc:postgresql://postgres:5432/lms_db \
  --from-literal=db-username=lms_user \
  --from-literal=db-password=secure_password \
  --from-literal=llama-api-key=gsk_xxx \
  --from-literal=openai-api-key=sk-xxx
```

---

## Security Considerations

1. **Never commit secrets** to version control
2. Use **environment-specific** `.env` files
3. Rotate API keys **regularly**
4. Use **Kubernetes secrets** or **Vault** in production
5. Restrict **database access** by IP in production

