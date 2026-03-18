#### **AI Service Internal URLs**
**application.yml (lines 68-72):**
```yaml
services:
  learning-service:
    url: ${LEARNING_SERVICE_URL:http://localhost:8089}
  user-service:
    url: ${USER_SERVICE_URL:http://localhost:8081}
```
**application-docker.yml (lines 36-38):**
```yaml
services:
  learning-service:
    url: http://learning-service:8089
```
**⚠️ ISSUE: Hardcoded but missing in docker profile**
**docker-compose.yml (lines 207-208):**
```yaml
LEARNING_SERVICE_URL=http://lms-learning-service:8089
USER_SERVICE_URL=http://lms-user-service:8081
```
**Problem:**
- ⚠️ docker-compose uses `lms-learning-service` (container name)
- ⚠️ application-docker.yml uses `learning-service` (hostname)
- ⚠️ docker-compose env vars override application-docker.yml
- ✅ **But this still works** because docker-compose values take precedence
---
## 4. DOCKER NETWORKING
### 4.1 Docker Compose Network Configuration
**File:** `/home/runner/work/learn_system/learn_system/docker-compose.yml`
**Network Definition (lines 394-395):**
```yaml
networks:
  lms-network:
    driver: bridge
```
**Status:** ✅ GOOD - All services on same bridge network
### 4.2 Service Container Names and Aliases
| Service | Container Name | Service Name (Eureka) | DNS Resolution |
|---------|---------------|-----------------------|-----------------|
| PostgreSQL | lms-postgres | N/A | ✅ postgres |
| Redis | lms-redis | N/A | ✅ redis |
| Eureka | lms-eureka-server | N/A | ✅ eureka-server |
| API Gateway | lms-api-gateway | lms-api-gateway | ⚠️ api-gateway |
| User Service | lms-user-service | lms-user-service | ⚠️ user-service |
| Learning Service | lms-learning-service | lms-learning-service | ⚠️ learning-service |
| AI Service | lms-ai-service | lms-ai-service | ❌ ai-service (NOT FOUND) |
| Analytics Service | lms-analytics-service | lms-analytics-service | ⚠️ analytics-service |
| Marketplace Service | lms-marketplace-service | lms-marketplace-service | ⚠️ marketplace-service |
| Frontend | lms-frontend | N/A | ✅ localhost/api-gateway |
---
### 4.3 Docker-Compose Service Dependencies
**Example: User Service (lines 118-124):**
```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
  eureka-server:
    condition: service_healthy
```
**Status:** ✅ GOOD - Waits for service health checks
### 4.4 Health Checks Configuration
**Example: API Gateway (lines 339-344):**
```yaml
healthcheck:
  test: [ "CMD", "curl", "-f", "http://localhost:8080/actuator/health" ]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```
**Status:** ✅ GOOD
---
## 5. MISSING/BROKEN CONNECTIONS
### 5.1 Critical Issues (🔴 BLOCKING)
#### **Issue #1: Marketplace Service Missing Docker Profile**
**Severity:** 🔴 CRITICAL
**Affected Service:** lms-marketplace-service
**Problem:**
- No `application-docker.yml` file exists
- Will use default `application.yml` on startup
- Default config points to `localhost:8761` for Eureka
- In Docker, will fail to connect to Eureka
- Service startup will timeout
**Error Signature:**
```
Unable to refresh the client config, retrying again later
Unable to notify Eureka because of: java.net.ConnectException: 127.0.0.1:8761
```
**Solution:**
Create `/backend-spring/lms-marketplace-service/src/main/resources/application-docker.yml`:
```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://postgres:5432/lms_db}
    username: ${SPRING_DATASOURCE_USERNAME:lms_user}
    password: ${SPRING_DATASOURCE_PASSWORD:lms_password}
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:redis}
      port: ${SPRING_DATA_REDIS_PORT:6379}
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    table: marketplace_flyway_schema_history
    validate-on-migrate: false
  jpa:
    hibernate:
      ddl-auto: none
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: marketplace-service
```
---
#### **Issue #2: Analytics Service Database Variable Mismatch**
**Severity:** 🔴 CRITICAL
**Affected Service:** lms-analytics-service
**Problem:**
- Base config (application.yml) expects: `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`
- docker-compose.yml provides: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
- **Mismatch** causes fallback to `localhost:5432`
- In Docker container, localhost:5432 doesn't exist (postgres is at `postgres:5432`)
- Service fails to connect to database
**Configuration (application.yml, lines 5-9):**
```yaml
datasource:
  url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/lms_dev}
  username: ${DB_USERNAME:postgres}
  password: ${DB_PASSWORD:postgres}
```
**docker-compose.yml (lines 245-247):**
```yaml
SPRING_DATASOURCE_URL=...
SPRING_DATASOURCE_USERNAME=...
SPRING_DATASOURCE_PASSWORD=...
```
**docker Override (application-docker.yml):**
```yaml
# This SHOULD fix it but check if it's being read correctly
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:...}
```
**But wait - Let's verify the docker profile is being used:**
```yaml
# From docker-compose.yml line 243:
SPRING_PROFILES_ACTIVE=docker,supabase
```
**Status Check:** 
- ✅ Docker profile IS active
- ✅ application-docker.yml DOES exist and uses `SPRING_DATASOURCE_URL`
- ✓ **This should work** because docker-compose provides `SPRING_DATASOURCE_*`
**Verdict:** ⚠️ POTENTIAL ISSUE if docker profile isn't loaded properly
---
#### **Issue #3: AI Service Disabled Eureka in Docker**
**Severity:** ⚠️ HIGH
**Affected Service:** lms-ai-service
**Problem:**
- application-docker.yml disables Eureka registration
- API gateway hardcodes `http://ai-service:8085` instead of using service discovery
- If AI service goes down, gateway won't know about it
- Service routing becomes fragile
**application-docker.yml (lines 29-33):**
```yaml
eureka:
  client:
    enabled: false
    register-with-eureka: false
    fetch-registry: false
```
**application-docker.yml (lines 36-38):**
```yaml
services:
  learning-service:
    url: http://learning-service:8089
```
**Problem:**
- `learning-service` hostname doesn't match container name `lms-learning-service`
- However, docker-compose env vars override this, so it works
---
#### **Issue #4: Frontend Vercel Configuration Missing BACKEND_URL**
**Severity:** 🔴 CRITICAL
**Affected File:** frontend/vercel.json
**Problem:**
- Uses `${BACKEND_URL}` environment variable
- Variable NOT defined in any `.env` example file
- Deployment to Vercel will fail without this variable
- Vercel rewrites won't work
**Configuration (vercel.json, lines 4-6):**
```json
{
  "source": "/api/:path*",
  "destination": "https://${BACKEND_URL}/api/:path*"
}
```
**Solution:**
Add to `.env.production.example`:
```
# Vercel deployment backend URL (without /api path)
# Example: api.yourdomain.com or your-backend.vercel.app
BACKEND_URL=api.your-domain.com
```
---
### 5.2 High-Priority Issues (⚠️ WARNING)
#### **Issue #5: Hardcoded localhost URLs in Application Configs**
**Severity:** ⚠️ HIGH
**Affected Files/Lines:**
- lms-user-service/application.yml:
  - Line 9: `jdbc:postgresql://localhost:5432/lms_db`
  - Line 137: `${APP_BASE_URL:https://localhost:3000}`
  - Line 140: `${EMAIL_VERIFICATION_URL:https://localhost:3000/verify-email}`
  - Line 153: `${GOOGLE_OAUTH_REDIRECT_URI:http://localhost:8080/api/auth/oauth2/google/callback}`
- lms-learning-service/application.yml:
  - Line 6: `jdbc:postgresql://localhost:5432/lms_dev`
- lms-ai-service/application.yml:
  - Line 12: `jdbc:postgresql://localhost:5432/lms_db`
- lms-analytics-service/application.yml:
  - Line 6: `jdbc:postgresql://localhost:5432/lms_dev`
- lms-marketplace-service/application.yml:
  - Line 6: `jdbc:postgresql://...localhost...`
**Problem:**
- These are fallback defaults when env vars not set
- In Docker, `localhost` doesn't route to host machine
- Services may fail if docker profiles not properly activated
**Mitigation:**
- ✅ Docker profiles DO override these values
- ✅ docker-compose.yml provides environment variables
- ⚠️ But **risky** if profile activation fails
**Recommendation:**
In docker-compose.yml, add explicit checks or ensure `SPRING_PROFILES_ACTIVE=docker` is always set.
---
#### **Issue #6: Analytics Service Flyway Disabled**
**Severity:** ⚠️ HIGH
**Affected Service:** lms-analytics-service
**Problem:**
- Flyway disabled by design: `enabled: false`
- Relies entirely on other services' migrations
- If learning-service migrations don't run, analytics breaks
- No schema versioning for analytics-specific tables
**Configuration (application.yml, line 32):**
```yaml
flyway:
  enabled: false  # Disabled - analytics reads from existing tables
```
**Impact:**
- ✅ Works if learning-service runs first and creates tables
- ⚠️ Fragile dependency
- ❌ Can't roll back analytics schema separately
**Recommendation:**
- Consider re-enabling Flyway for analytics with empty initial versions
- Or document the startup order requirement
---
### 5.3 Medium-Priority Issues (⚠️ CAUTION)
#### **Issue #7: Service Hostname vs Container Name Inconsistency**
**Severity:** ⚠️ MEDIUM
**Details:**
In Docker profiles, services specify `hostname`:
```yaml
eureka:
  instance:
    hostname: learning-service  # This is the Eureka service name
```
But docker-compose uses `container_name`:
```yaml
container_name: lms-learning-service  # This is the Docker hostname
```
**Inconsistency:**
- Gateway routes use `lb://lms-learning-service` (from Eureka)
- But container DNS resolution works by `container_name` (lms-learning-service)
- Nginx uses `http://api-gateway:8080` (container name, not Eureka name)
**Resolution:**
- ✅ Docker Bridge Network resolves by container_name
- ✅ Services register with Eureka using hostname  
- ✅ **This works because:**
  - Docker DNS: lms-learning-service:8089
  - Eureka service name: lms-learning-service
  - They match!
**But Look at AI Service:**
```yaml
# docker-compose.yml
container_name: lms-ai-service
# application-docker.yml
hostname: (not specified, should be ai-service or lms-ai-service)
# application-docker.yml routes reference:
url: http://learning-service:8089  # Uses hostname, not container_name
```
**Problem:** AI service will have mismatched hostname/container_name
---
#### **Issue #8: Inconsistent Variable Naming Across Services**
**Severity:** ⚠️ MEDIUM
**Summary:**
| Service | Uses |
|---------|------|
| user-service | `SPRING_DATASOURCE_*` |
| learning-service | `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD` |
| ai-service | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` |
| analytics-service | `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD` |
| marketplace-service | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` |
**Problem:**
- Makes environment configuration error-prone
- Harder to provide consistent docker-compose.yml
- Increased risk of connection failures
**Current Handling:**
- ✅ docker-compose.yml provides multiple variable formats
- ✅ Each service's docker profile translates appropriately
---
### 5.4 Low-Priority Issues (ℹ️ INFORMATIONAL)
#### **Issue #9: Redundant Database URL Configuration**
**Severity:** ℹ️ LOW
**Example (learning-service, docker-compose.yml, lines 148-153):**
```yaml
SPRING_DATASOURCE_URL=jdbc:postgresql://...
DATABASE_URL=jdbc:postgresql://...
DB_USERNAME=...
DB_PASSWORD=...
```
**Problem:**
- `SPRING_DATASOURCE_URL` and `DATABASE_URL` are redundant
- Config provides both but only one is used
**Impact:** None - just redundancy. Clarify documentation.
---
## 6. SUMMARY TABLE: CONNECTIVITY STATUS
| Component | Status | Issues |
|-----------|--------|--------|
| Frontend → API Gateway | ✅ Good | BACKEND_URL missing for Vercel |
| API Gateway → User Service | ✅ Good | None |
| API Gateway → Learning Service | ✅ Good | None |
| API Gateway → AI Service | ⚠️ Hardcoded | Eureka disabled, direct HTTP |
| API Gateway → Analytics Service | ✅ Good | Database var mismatch risk |
| API Gateway → Marketplace Service | ❌ Missing Profile | No docker-compose profile |
| User Service → PostgreSQL | ✅ Good | None |
| Learning Service → PostgreSQL | ✅ Good | None |
| AI Service → PostgreSQL | ✅ Good | None |
| Analytics Service → PostgreSQL | ⚠️ Risk | Flyway disabled, var mismatch |
| Marketplace Service → PostgreSQL | ❌ No Profile | Will try localhost:8761 |
| All Services → Redis | ✅ Good | None |
| All Services → Eureka | ⚠️ Partial | Marketplace missing, AI disabled |
| Nginx → API Gateway | ✅ Good | Uses container_name correctly |
---
## 7. DETAILED FIXES REQUIRED
### FIX #1: Create Marketplace Docker Profile
**File:** `/backend-spring/lms-marketplace-service/src/main/resources/application-docker.yml`
**Content:**
```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://postgres:5432/lms_db}
    username: ${SPRING_DATASOURCE_USERNAME:lms_user}
    password: ${SPRING_DATASOURCE_PASSWORD:lms_password}
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:redis}
      port: ${SPRING_DATA_REDIS_PORT:6379}
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    table: marketplace_flyway_schema_history
    validate-on-migrate: false
  jpa:
    hibernate:
      ddl-auto: none
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: marketplace-service
```
---
### FIX #2: Update .env.production.example with BACKEND_URL
**File:** `.env.production.example`
**Add:**
```yaml
# ==========================================
# FRONTEND DEPLOYMENT (Vercel)
# ==========================================
# Backend API URL for Vercel rewrites
# Should be your production API domain (without /api path)
# Example: api.yourdomain.com, api.your-app.com, or your-backend.vercel.app
BACKEND_URL=api.your-domain.com
```
---
### FIX #3: Clarify Analytics Service Flyway Strategy
**Option A: Enable Flyway (Recommended)**
Modify `/backend-spring/lms-analytics-service/src/main/resources/application.yml`:
```yaml
flyway:
  enabled: true
  baseline-on-migrate: true
  baseline-version: 0
  locations: classpath:db/migration
  table: analytics_flyway_schema_history
  validate-on-migrate: true
```
**Option B: Document Dependency (Current)**
Add comment to application.yml:
```yaml
flyway:
  enabled: false
  # NOTE: Analytics service assumes learning-service has already created all shared tables.
  # Startup order: learning-service must start before analytics-service
  # See docker-compose.yml depends_on configuration
```
---
### FIX #4: Enable AI Service Eureka Registration
**Option A: Use Service Discovery (Recommended)**
Modify `/backend-spring/lms-ai-service/src/main/resources/application-docker.yml`:
```yaml
# CHANGE FROM:
eureka:
  client:
    enabled: false
    register-with-eureka: false
    fetch-registry: false
# CHANGE TO:
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: ai-service
```
And update API Gateway routes (application.yml lines 107-138):
```yaml
- id: ai-service-v1
  uri: lb://lms-ai-service  # Use load balancer instead of hardcoded URL
  
- id: ai-service
  uri: lb://lms-ai-service  # Use load balancer instead of hardcoded URL
```
**Option B: Keep Hardcoded but Document**
If using hardcoded URLs is intentional:
```yaml
# application-docker.yml
# AI service intentionally bypasses Eureka for direct, reliable routing
eureka:
  client:
    enabled: false
    register-with-eureka: false
    fetch-registry: false
```
And update docker-compose.yml:
```yaml
ai-service:
  # ... other config ...
  # Explicit dependency on API Gateway being up
  depends_on:
    api-gateway:
      condition: service_healthy
```
---
### FIX #5: Standardize Service URL References
Create common config in docker-compose.yml or document patterns:
```yaml
# Option 1: Use Eureka for all services (simplest)
# - Update application-docker.yml to enable Eureka for AI service
# - Use lb:// prefix in all gateway routes
# - Update docker-compose.yml to not pass service URLs
# Option 2: Keep current hardcoded approach but standardize
# - Standardize on LEARNING_SERVICE_URL, USER_SERVICE_URL, AI_SERVICE_URL
# - Update all services to use these consistently
# - Update application-docker.yml to use these
# Option 3: Use Docker Compose service names directly
# - Use container_name: (not lms- prefix) for service names
# - Use service names in connections
# - Update docker-compose.yml networking
```
**Recommendation:** Option 1 (Eureka for all) is cleanest long-term.
---
### FIX #6: Document Frontend Environment Setup
Add to frontend/.env.example:
```
# ==========================================
# FRONTEND VITE CONFIGURATION
# ==========================================
# API URL for client-side requests (usually relative path for production)
VITE_API_URL=/api
# AI service endpoint (through API Gateway by default)
VITE_AI_SERVICE_URL=/api/ai
# Dev server proxy target (only used during "npm run dev")
VITE_API_TARGET=http://localhost:8080
# Feature flags
VITE_REQUIRE_UCU_EMAIL=false
# Push notifications
VITE_VAPID_PUBLIC_KEY=
# ==========================================
# PRODUCTION DEPLOYMENT NOTES
# ==========================================
# For Vercel deployment:
# 1. Set BACKEND_URL in Vercel environment variables
# 2. Ensure GATEWAY_CORS_ALLOWED_ORIGINS includes your Vercel URL
# 3. Update vercel.json with correct domain
```
---
## 8. TESTING CONNECTIVITY
### 8.1 Docker Compose Startup Test
```bash
# Full system startup
docker compose --env-file .env.production up -d
# Check container health
docker compose ps
# Expected output (all healthy):
# lms-postgres              ... (healthy)
# lms-redis                 ... (healthy)
# lms-eureka-server         ... (healthy)
# lms-user-service          ... (healthy)
# lms-learning-service      ... (healthy)
# lms-ai-service            ... (healthy)
# lms-analytics-service     ... (healthy)
# lms-marketplace-service   ... (healthy)
# lms-api-gateway           ... (healthy)
# lms-frontend              ... (healthy)
```
### 8.2 Service Registration Verification
```bash
# Check Eureka dashboard
curl -s http://localhost:8761/eureka/v2/apps | grep '<name>'
# Expected services:
# lms-user-service
# lms-learning-service
# lms-ai-service (if fix #4 is applied)
# lms-analytics-service
# lms-marketplace-service
# lms-api-gateway
```
### 8.3 Database Connectivity Test
```bash
# Test user-service DB connection
docker compose exec user-service curl -s http://localhost:8081/actuator/health | grep -i status
# Test all services
for service in user-service learning-service ai-service analytics-service marketplace-service; do
  echo "=== $service ==="
  docker compose exec $service curl -s http://localhost:8081/actuator/health 2>/dev/null | jq '.status'
done
```
### 8.4 Frontend Connectivity Test
```bash
# Test API Gateway from frontend
docker compose exec frontend curl -s http://api-gateway:8080/actuator/health
# Test from localhost
curl -s http://localhost:8080/actuator/health
# Test full flow
curl -s http://localhost:3000 | head -20  # Should get HTML, not 502
```
---
## 9. RECOMMENDATIONS
### High Priority (Do First)
1. ✅ **Create marketplace-service docker profile** - Blocks deployment
2. ✅ **Add BACKEND_URL to .env.production.example** - Blocks Vercel deployment  
3. ✅ **Enable AI Service Eureka** - Improves reliability
### Medium Priority (Do Soon)
4. ⚠️ **Document Analytics Flyway dependency** - Clarify startup order
5. ⚠️ **Standardize database variable naming** - Reduce configuration errors
6. ⚠️ **Document service hostname vs container_name mapping** - Easier troubleshooting
### Low Priority (Nice to Have)
7. ℹ️ **Remove redundant DB URL variables** - Simplify configuration
8. ℹ️ **Add startup order documentation** - Prevent confusion
9. ℹ️ **Create docker-compose health check dashboard** - Monitoring
---
## 10. CONCLUSION
The LearnSystem architecture demonstrates solid microservices patterns with Spring Cloud Gateway and Eureka service discovery. The frontend-to-backend connection is well-designed with proper proxy configuration and CORS settings.
**Critical Issues Found:** 3
- Marketplace service missing docker profile
- Frontend Vercel configuration incomplete
- Analytics database variable mismatch risk
**High-Priority Issues:** 2
- AI service Eureka disabled
- Flyway disabled for analytics
**Medium-Priority Issues:** 3
- Service naming inconsistencies
- Variable naming standardization
- Documentation gaps
**Overall Assessment:** System is **production-ready** with fixes for identified issues. The redundancies and fallbacks provide good fault tolerance, but the critical issues must be resolved before production deployment.
---
## APPENDIX: File Manifest
### Frontend Files
- `/frontend/src/api/client.ts` - API client with JWT refresh
- `/frontend/vite.config.ts` - Development proxy configuration
- `/frontend/vercel.json` - Vercel deployment rewrites
- `/frontend/.env.example` - Frontend environment template
- `/frontend/nginx.conf` - Docker nginx proxy configuration
- `/frontend/Dockerfile` - Multi-stage frontend build
### Backend Configuration Files
- `/backend-spring/lms-api-gateway/src/main/resources/application.yml`
- `/backend-spring/lms-api-gateway/src/main/resources/application-docker.yml`
- `/backend-spring/lms-user-service/src/main/resources/application*.yml` (4 files)
- `/backend-spring/lms-learning-service/src/main/resources/application*.yml` (3 files)
- `/backend-spring/lms-ai-service/src/main/resources/application*.yml` (3 files)
- `/backend-spring/lms-analytics-service/src/main/resources/application*.yml` (3 files)
- `/backend-spring/lms-marketplace-service/src/main/resources/application.yml` (1 file - missing docker)
### Database Migration Files
- Learning Service: 25+ migrations
- User Service: Multiple migrations
- AI Service: 3 migrations
- Marketplace Service: 1 migration
- Analytics Service: 1 migration (disabled)
### Docker/Deployment Files
- `/docker-compose.yml` - Full stack composition
- `/.env.example` - Environment template
- `/.env.production.example` - Production environment template
EOF
cat /tmp/connectivity_report.md
                EC=$?
                echo "___BEGIN___COMMAND_DONE_MARKER___$EC"
            }
___BEGIN___COMMAND_OUTPUT_MARKER___
# LearnSystem Connectivity Analysis Report

## Executive Summary

The LearnSystem repository demonstrates a well-structured microservices architecture with Spring Cloud Gateway, Eureka service discovery, and Spring Boot microservices. However, several critical connectivity issues and mismatches have been identified between frontend, backend, and database components that could cause failures in Docker environments.

---

## 1. FRONTEND → BACKEND CONNECTIVITY

### 1.1 Frontend API Client Configuration

**File:** `/home/runner/work/learn_system/learn_system/frontend/src/api/client.ts`

**Status:** ✅ GOOD with caveats

**How it Works:**
- Uses axios with intelligent fallback chain:
  1. Reads `VITE_API_URL` or `REACT_APP_API_URL` env vars (preferred)
  2. Falls back to `http://localhost:8080/api` for localhost development
  3. Final fallback to relative path `/api` (same-origin)
- Implements JWT token refresh with interceptors
- Has proper 401/429 error handling

**Lines 5-19 (client.ts):**
```typescript
let API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || '';
if (!API_BASE_URL) {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    if (host === 'localhost' || host === '127.0.0.1') {
      API_BASE_URL = `${protocol}//localhost:8080/api`;  // HARDCODED DEFAULT
    }
  }
}
if (!API_BASE_URL) API_BASE_URL = '/api';  // RELATIVE PATH FALLBACK
```

**Issues Identified:**
- ⚠️ **HARDCODED localhost:8080** appears as fallback (line 13). This will fail in production if VITE_API_URL is not set
- ✅ Relative path fallback (`/api`) is correct for Docker/production deployments

### 1.2 Vite Development Server Proxy

**File:** `/home/runner/work/learn_system/learn_system/frontend/vite.config.ts`

**Status:** ✅ GOOD

**Configuration:**
```typescript
const apiTarget = env.VITE_API_TARGET || 'http://localhost:8080'
server: {
  host: true,
  port: 5173,
  proxy: {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      secure: false,
    },
  },
}
```

**Analysis:**
- ✅ Correctly proxies `/api` requests to backend target during development
- ✅ `VITE_API_TARGET` is configurable via environment
- ✅ Defaults to `http://localhost:8080` (appropriate for dev)
- **Note:** This proxy is only used during `npm run dev`, not in production builds

### 1.3 Frontend Environment Variables

**File:** `/home/runner/work/learn_system/learn_system/frontend/.env.example`

**Status:** ✅ GOOD

**Configuration:**
```
VITE_API_URL=/api                          # Browser-side API URL (relative path)
VITE_AI_SERVICE_URL=/api/ai               # AI service through gateway
VITE_API_TARGET=http://localhost:8080     # Vite dev proxy target
```

**Analysis:**
- ✅ Uses relative path `/api` for production (correct for Docker)
- ✅ All services routed through API Gateway (`/api/ai` goes to gateway, not direct)
- ✅ Proper separation between dev proxy target and browser API URL

### 1.4 Frontend Nginx Configuration (Docker)

**File:** `/home/runner/work/learn_system/learn_system/frontend/nginx.conf`

**Status:** ✅ EXCELLENT

**Configuration:**
```nginx
location /api/ {
    proxy_pass http://api-gateway:8080/api/;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location / {
    try_files $uri $uri/ /index.html;  # SPA routing
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

**Analysis:**
- ✅ Correctly proxies to API Gateway **by container name** (`api-gateway:8080`)
- ✅ Uses Docker network resolution (not localhost)
- ✅ Proper SPA fallback routing
- ✅ Excellent security headers included

### 1.5 Vercel Deployment Configuration

**File:** `/home/runner/work/learn_system/learn_system/frontend/vercel.json`

**Status:** ⚠️ ISSUE IDENTIFIED

**Configuration:**
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://${BACKEND_URL}/api/:path*"
    },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Issues:**
- ⚠️ **Environment variable `${BACKEND_URL}` is used but NOT defined in .env.example or .env.production.example**
- ⚠️ Uses `https://` hard-coded protocol - will fail if backend is only http
- ⚠️ **MISSING from .env.production.example** - developers won't know to set this
- 🔴 **CRITICAL:** Without `BACKEND_URL`, Vercel rewrites will fail

**Missing:**
```
# Should add to .env.production.example:
BACKEND_URL=api.your-domain.com    # or https://api.your-domain.com (depends on rewrite syntax)
```

### 1.6 CORS Settings in API Gateway

**File:** `/home/runner/work/learn_system/learn_system/backend-spring/lms-api-gateway/src/main/resources/application.yml`

**Status:** ✅ GOOD

**Configuration (Lines 183-190):**
```yaml
gateway:
  cors:
    allowed-origins: ${GATEWAY_CORS_ALLOWED_ORIGINS:http://localhost:3000,https://localhost:3000,http://localhost:8080,https://localhost:8080,http://localhost:5173,https://localhost:5173}
    allowed-methods: GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD
    allowed-headers: Authorization,Content-Type,Accept,X-Requested-With
    exposed-headers: Authorization,Content-Type,X-Total-Count,X-Page-Number,X-Page-Size
    allow-credentials: true
    max-age-seconds: 3600
```

**Environment Override (docker-compose.yml, line 333):**
```yaml
- GATEWAY_CORS_ALLOWED_ORIGINS=${GATEWAY_CORS_ALLOWED_ORIGINS:-http://localhost:3000,http://localhost:5173}
```

**Analysis:**
- ✅ CORS properly configured with sensible defaults
- ✅ Environment variable override for production URLs
- ✅ Allows credentials (important for JWT tokens)
- ✅ Comments in docker-compose.yml indicate where to add Vercel URL

**Recommendation:**
Document that in production, set:
```
GATEWAY_CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

---

## 2. BACKEND → DATABASE CONNECTIVITY

### 2.1 Database Configuration Overview

**Services with Database Access:**
1. `lms-user-service` (port 8081)
2. `lms-learning-service` (port 8089)
3. `lms-ai-service` (port 8085)
4. `lms-analytics-service` (port 8088)
5. `lms-marketplace-service` (port 8086)
6. Eureka Server (no database)

### 2.2 DataSource Configuration by Service

#### **lms-user-service**

**File:** `/home/runner/work/learn_system/learn_system/backend-spring/lms-user-service/src/main/resources/application.yml`

**Lines 8-18:**
```yaml
datasource:
  url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/lms_db}
  username: ${SPRING_DATASOURCE_USERNAME:lms_user}
  password: ${SPRING_DATASOURCE_PASSWORD:lms_password}
  driver-class-name: org.postgresql.Driver
```

**Docker Override (application-docker.yml, lines 3-6):**
```yaml
datasource:
  url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://postgres:5432/lms_db}
  username: ${SPRING_DATASOURCE_USERNAME:lms_user}
  password: ${SPRING_DATASOURCE_PASSWORD:lms_password}
```

**docker-compose.yml (lines 104-106):**
```yaml
SPRING_DATASOURCE_URL=jdbc:postgresql://${SUPABASE_DB_HOST:-postgres}:${SUPABASE_DB_PORT:-5432}/${SUPABASE_DB_NAME:-lms_db}
SPRING_DATASOURCE_USERNAME=${SUPABASE_DB_USER:-lms_user}
SPRING_DATASOURCE_PASSWORD=${SUPABASE_DB_PASSWORD:-lms_password_local}
```

**Status:** ✅ GOOD - Uses environment variables correctly

**Flyway Migrations:**
- ✅ **Enabled** in base config (line 72)
- ✅ **Enabled** in docker profile (application-docker.yml, line 17)
- ✅ Migration files exist: `db/migration/` directory
- ✅ Proper history table: `user_flyway_schema_history`

---

#### **lms-learning-service**

**File:** `/home/runner/work/learn_system/learn_system/backend-spring/lms-learning-service/src/main/resources/application.yml`

**Lines 5-9:**
```yaml
datasource:
  url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/lms_dev}
  username: ${DB_USERNAME:postgres}
  password: ${DB_PASSWORD:postgres}
```

**⚠️ ISSUE: Different environment variable names than other services!**

**docker-compose.yml (lines 148-153):**
```yaml
SPRING_DATASOURCE_URL=jdbc:postgresql://${SUPABASE_DB_HOST:-postgres}:${SUPABASE_DB_PORT:-5432}/${SUPABASE_DB_NAME:-lms_db}
DATABASE_URL=jdbc:postgresql://${SUPABASE_DB_HOST:-postgres}:${SUPABASE_DB_PORT:-5432}/${SUPABASE_DB_NAME:-lms_db}
DB_USERNAME=${SUPABASE_DB_USER:-lms_user}
DB_PASSWORD=${SUPABASE_DB_PASSWORD:-lms_password_local}
```

**Status:** ⚠️ INCONSISTENT VARIABLE NAMES

**Issue:**
- Expects `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`
- But docker-compose provides BOTH patterns (redundant)
- **However:** This redundancy actually WORKS - config provides both
- ✅ Flyway migrations: **Enabled**, 25+ migration files present
- ✅ History table: `course_flyway_schema_history`

**docker-compose.yml override in application-docker.yml (lines 4-6):**
```yaml
url: ${SPRING_DATASOURCE_URL:${DATABASE_URL:jdbc:postgresql://postgres:5432/lms_db}}
username: ${SPRING_DATASOURCE_USERNAME:${DB_USERNAME:lms_user}}
password: ${SPRING_DATASOURCE_PASSWORD:${DB_PASSWORD:lms_password}}
```

---

#### **lms-ai-service**

**File:** `/home/runner/work/learn_system/learn_system/backend-spring/lms-ai-service/src/main/resources/application.yml`

**Lines 11-15:**
```yaml
datasource:
  url: ${DB_URL:jdbc:postgresql://localhost:5432/lms_db}
  username: ${DB_USERNAME:lms_user}
  password: ${DB_PASSWORD:lms_password}
```

**⚠️ ISSUE: Uses `DB_URL` instead of `DATABASE_URL` or `SPRING_DATASOURCE_URL`**

**docker-compose.yml (lines 197-200):**
```yaml
# AI service uses DB_URL/DB_USERNAME/DB_PASSWORD (not SPRING_DATASOURCE_*)
DB_URL=jdbc:postgresql://${SUPABASE_DB_HOST:-postgres}:${SUPABASE_DB_PORT:-5432}/${SUPABASE_DB_NAME:-lms_db}
DB_USERNAME=${SUPABASE_DB_USER:-lms_user}
DB_PASSWORD=${SUPABASE_DB_PASSWORD:-lms_password_local}
```

**Status:** ✅ CONSISTENT (by design) - Uses custom env vars but documented

**Docker Profile (application-docker.yml, lines 4-6):**
```yaml
datasource:
  url: ${DB_URL:jdbc:postgresql://postgres:5432/lms_db}
  username: ${DB_USERNAME:lms_user}
  password: ${DB_PASSWORD:lms_password}
```

**Flyway Migrations:**
- ✅ **Enabled** in base config (line 29)
- ✅ **Enabled** in docker profile (line 14)
- ✅ Migration files: 3 files present
- ✅ History table: `ai_flyway_schema_history`

---

#### **lms-analytics-service**

**File:** `/home/runner/work/learn_system/learn_system/backend-spring/lms-analytics-service/src/main/resources/application.yml`

**Lines 5-9:**
```yaml
datasource:
  url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/lms_dev}
  username: ${DB_USERNAME:postgres}
  password: ${DB_PASSWORD:postgres}
```

**⚠️ ISSUE: Different variable names (like learning-service)**

**docker-compose.yml (lines 245-247):**
```yaml
SPRING_DATASOURCE_URL=jdbc:postgresql://${SUPABASE_DB_HOST:-postgres}:${SUPABASE_DB_PORT:-5432}/${SUPABASE_DB_NAME:-lms_db}
SPRING_DATASOURCE_USERNAME=${SUPABASE_DB_USER:-lms_user}
SPRING_DATASOURCE_PASSWORD=${SUPABASE_DB_PASSWORD:-lms_password_local}
```

**Status:** ⚠️ ISSUE - Variable name mismatch

**Problem:**
- Config expects `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`
- docker-compose provides `SPRING_DATASOURCE_*`
- ❌ This may cause fallback to localhost:5432 in Docker!

**Flyway Configuration (line 32):**
```yaml
enabled: false  # Disabled - analytics reads from existing tables created by other services
```

**Status:** ⚠️ CRITICAL ISSUE
- ⚠️ **Flyway disabled** - relies on other services to create tables
- ⚠️ **No migration files** - only 1 SQL file that looks like copy from learning-service
- ⚠️ **Single point of failure** - if learning-service migrations don't run, analytics breaks

---

#### **lms-marketplace-service**

**File:** `/home/runner/work/learn_system/learn_system/backend-spring/lms-marketplace-service/src/main/resources/application.yml`

**Lines 6-8:**
```yaml
datasource:
  url: ${DATABASE_URL:jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:lms_db}}
  username: ${DB_USERNAME:lms_user}
  password: ${DB_PASSWORD:lms_password_local}
```

**⚠️ ISSUE: Custom variable names with component-level env vars**

**docker-compose.yml (lines 284-288):**
```yaml
- DB_HOST=${SUPABASE_DB_HOST:-postgres}
- DB_PORT=${SUPABASE_DB_PORT:-5432}
- DB_NAME=${SUPABASE_DB_NAME:-lms_db}
- DB_USERNAME=${SUPABASE_DB_USER:-lms_user}
- DB_PASSWORD=${SUPABASE_DB_PASSWORD:-lms_password_local}
```

**Status:** ✅ CORRECT - Uses consistent pattern with fallbacks

**Missing Docker Profile:**
- ❌ **No `application-docker.yml` file** for marketplace service
- ⚠️ Will use only default application.yml
- ⚠️ Default hostname values will try to connect to localhost during startup

**Flyway:**
- ✅ **Enabled** (line 32)
- ✅ 1 migration file: `V1__create_marketplace_tables.sql`
- ✅ History table: `marketplace_flyway_schema_history`

---

### 2.3 JPA/Hibernate Configuration

**Consistency Analysis:**

All services use:
```yaml
jpa:
  hibernate:
    ddl-auto: validate  # VALIDATE NOT CREATE - correct for migrations
  show-sql: false
  open-in-view: false  # Good practice - prevents lazy loading in views
```

**Exception - Docker Profiles:**
```yaml
jpa:
  hibernate:
    ddl-auto: none  # Explicitly set to none in docker profile
```

**Status:** ✅ GOOD - Proper separation of concerns

---

### 2.4 Flyway Migration Summary

| Service | Migrations Enabled | Migration Files | History Table | Docker Profile |
|---------|-------------------|-----------------|----------------|----------------|
| user-service | ✅ Yes | Found | user_flyway_schema_history | ✅ Has docker.yml |
| learning-service | ✅ Yes | 25+ files | course_flyway_schema_history | ✅ Has docker.yml |
| ai-service | ✅ Yes | 3 files | ai_flyway_schema_history | ✅ Has docker.yml |
| analytics-service | ❌ **NO** | 1 file (copy) | analytics_flyway_schema_history | ✅ Has docker.yml |
| marketplace-service | ✅ Yes | 1 file | marketplace_flyway_schema_history | ❌ **MISSING** |

---

### 2.5 Database Connection Pool Configuration

**user-service (application.yml, lines 13-18):**
```yaml
hikari:
  maximum-pool-size: 10
  minimum-idle: 5
  connection-timeout: 30000
  idle-timeout: 600000
  max-lifetime: 1800000
```

**learning-service (application.yml, lines 10-15):**
```yaml
hikari:
  maximum-pool-size: 10
  minimum-idle: 5
  idle-timeout: 300000
  connection-timeout: 20000
  max-lifetime: 1200000
```

**Status:** ✅ GOOD - Reasonable pool settings for microservices

---

### 2.6 Redis Configuration

**All Services Use:**
```yaml
data:
  redis:
    host: ${SPRING_DATA_REDIS_HOST:localhost}  # or ${REDIS_HOST:localhost}
    port: ${SPRING_DATA_REDIS_PORT:6379}       # or ${REDIS_PORT:6379}
```

**docker-compose.yml (lines 107-108):**
```yaml
SPRING_DATA_REDIS_HOST=redis
SPRING_DATA_REDIS_PORT=6379
```

**Status:** ✅ GOOD - Uses container name for Docker

---

## 3. SERVICE DISCOVERY (EUREKA)

### 3.1 Eureka Configuration

**Eureka Server Configuration:**

**File:** `/home/runner/work/learn_system/learn_system/backend-spring/lms-eureka-server/src/main/resources/application.yml`

**Base Config:**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: http://localhost:8761/eureka
    register-with-eureka: false
    fetch-registry: false
```

**Docker Override (application-docker.yml):**
```yaml
eureka:
  client:
    enabled: true
    serviceUrl:
      defaultZone: http://eureka-server:8761/eureka
    register-with-eureka: false
    fetch-registry: false
```

**docker-compose.yml (lines 79-83):**
```yaml
healthcheck:
  test: [ "CMD", "curl", "-f", "http://localhost:8761/actuator/health" ]
```

**Status:** ✅ GOOD

---

### 3.2 Service Registration Configuration

#### **API Gateway**

**application.yml (lines 209-214):**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://localhost:8761/eureka}
  instance:
    prefer-ip-address: true
```

**application-docker.yml (lines 158-164):**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: api-gateway
```

**docker-compose.yml (line 329):**
```yaml
EUREKA_URI=http://eureka-server:8761/eureka
```

**Status:** ✅ GOOD

**Gateway Routes (application.yml, lines 24-169):**
- Uses `lb://lms-user-service` (load balancer prefix)
- Uses `lb://lms-learning-service`
- Uses `lb://lms-ai-service`
- Uses `lb://lms-marketplace-service`
- Uses `lb://lms-analytics-service`

**Issue Found:**
In `application-docker.yml` (lines 95-112), AI service routes are hardcoded:
```yaml
- id: ai-service-v1
  uri: ${AI_SERVICE_URI:http://ai-service:8085}
  
- id: ai-service
  uri: ${AI_SERVICE_URI:http://ai-service:8085}
```

**❌ ISSUE:** Gateway disables Eureka for AI service in Docker
```yaml
eureka:
  client:
    enabled: false
    register-with-eureka: false
    fetch-registry: false
```

**This means:**
- ✅ AI service works in Docker (hardcoded URL)
- ❌ AI service doesn't register with Eureka in Docker
- ❌ Not using service discovery in Docker

---

#### **User Service**

**application.yml (lines 165-173):**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://localhost:8761/eureka}
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true
    instance-id: ${spring.application.name}:${spring.application.instance_id:${random.value}}
```

**application-docker.yml (lines 44-50):**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: user-service
```

**Status:** ✅ GOOD

---

#### **Learning Service**

**application.yml (lines 139-147):**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://localhost:8761/eureka}
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true
```

**application-docker.yml (lines 30-36):**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: learning-service
```

**Status:** ✅ GOOD

---

#### **AI Service**

**application.yml (lines 128-136):**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://localhost:8761/eureka}
    register-with-eureka: true
    fetch-registry: true
```

**application-docker.yml (lines 29-33):**
```yaml
eureka:
  client:
    enabled: false
    register-with-eureka: false
    fetch-registry: false
```

**Status:** ❌ CRITICAL ISSUE

**Problem:**
- ⚠️ AI service disables Eureka registration in Docker
- ⚠️ **No `hostname` specified** in docker profile
- ⚠️ Service won't be discoverable in Docker environment
- ⚠️ Gateway uses hardcoded URI instead of service discovery

---

#### **Analytics Service**

**application.yml (lines 120-135):**
```yaml
eureka:
  client:
    enabled: ${EUREKA_ENABLED:true}
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://localhost:8761/eureka}
    register-with-eureka: ${EUREKA_ENABLED:true}
    fetch-registry: ${EUREKA_ENABLED:true}
  instance:
    prefer-ip-address: true
```

**application-docker.yml (lines 30-36):**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: analytics-service
```

**Status:** ✅ GOOD

---

#### **Marketplace Service**

**application.yml (lines 53-66):**
```yaml
eureka:
  client:
    enabled: ${EUREKA_ENABLED:true}
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://localhost:8761/eureka}
    register-with-eureka: ${EUREKA_ENABLED:true}
    fetch-registry: ${EUREKA_ENABLED:true}
  instance:
    prefer-ip-address: true
```

**⚠️ CRITICAL ISSUE: No Docker Profile**

**Problem:**
- ❌ **No `application-docker.yml`** file exists
- ❌ Will use default profile which sets `register-with-eureka: true`
- ❌ Will try to register with `http://localhost:8761/eureka` (WRONG URL)
- ❌ Won't find Eureka in Docker environment
- ❌ Service startup will fail or hang

**What Should Happen:**
```yaml
# application-docker.yml (MISSING)
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: marketplace-service
```

---

### 3.3 Service URL References for Inter-Service Communication

#### **AI Service Internal URLs**

**application.yml (lines 68-72):**
```yaml
services:
  learning-service:
    url: ${LEARNING_SERVICE_URL:http://localhost:8089}
  user-service:
    url: ${USER_SERVICE_URL:http://localhost:8081}
```

**application-docker.yml (lines 36-38):**
```yaml
services:
  learning-service:
    url: http://learning-service:8089
```

**⚠️ ISSUE: Hardcoded but missing in docker profile**

**docker-compose.yml (lines 207-208):**
```yaml
LEARNING_SERVICE_URL=http://lms-learning-service:8089
USER_SERVICE_URL=http://lms-user-service:8081
```

**Problem:**
- ⚠️ docker-compose uses `lms-learning-service` (container name)
- ⚠️ application-docker.yml uses `learning-service` (hostname)
- ⚠️ docker-compose env vars override application-docker.yml
- ✅ **But this still works** because docker-compose values take precedence

---

## 4. DOCKER NETWORKING

### 4.1 Docker Compose Network Configuration

**File:** `/home/runner/work/learn_system/learn_system/docker-compose.yml`

**Network Definition (lines 394-395):**
```yaml
networks:
  lms-network:
    driver: bridge
```

**Status:** ✅ GOOD - All services on same bridge network

### 4.2 Service Container Names and Aliases

| Service | Container Name | Service Name (Eureka) | DNS Resolution |
|---------|---------------|-----------------------|-----------------|
| PostgreSQL | lms-postgres | N/A | ✅ postgres |
| Redis | lms-redis | N/A | ✅ redis |
| Eureka | lms-eureka-server | N/A | ✅ eureka-server |
| API Gateway | lms-api-gateway | lms-api-gateway | ⚠️ api-gateway |
| User Service | lms-user-service | lms-user-service | ⚠️ user-service |
| Learning Service | lms-learning-service | lms-learning-service | ⚠️ learning-service |
| AI Service | lms-ai-service | lms-ai-service | ❌ ai-service (NOT FOUND) |
| Analytics Service | lms-analytics-service | lms-analytics-service | ⚠️ analytics-service |
| Marketplace Service | lms-marketplace-service | lms-marketplace-service | ⚠️ marketplace-service |
| Frontend | lms-frontend | N/A | ✅ localhost/api-gateway |

---

### 4.3 Docker-Compose Service Dependencies

**Example: User Service (lines 118-124):**
```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
  eureka-server:
    condition: service_healthy
```

**Status:** ✅ GOOD - Waits for service health checks

### 4.4 Health Checks Configuration

**Example: API Gateway (lines 339-344):**
```yaml
healthcheck:
  test: [ "CMD", "curl", "-f", "http://localhost:8080/actuator/health" ]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```

**Status:** ✅ GOOD

---

## 5. MISSING/BROKEN CONNECTIONS

### 5.1 Critical Issues (🔴 BLOCKING)

#### **Issue #1: Marketplace Service Missing Docker Profile**

**Severity:** 🔴 CRITICAL

**Affected Service:** lms-marketplace-service

**Problem:**
- No `application-docker.yml` file exists
- Will use default `application.yml` on startup
- Default config points to `localhost:8761` for Eureka
- In Docker, will fail to connect to Eureka
- Service startup will timeout

**Error Signature:**
```
Unable to refresh the client config, retrying again later
Unable to notify Eureka because of: java.net.ConnectException: 127.0.0.1:8761
```

**Solution:**
Create `/backend-spring/lms-marketplace-service/src/main/resources/application-docker.yml`:
```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://postgres:5432/lms_db}
    username: ${SPRING_DATASOURCE_USERNAME:lms_user}
    password: ${SPRING_DATASOURCE_PASSWORD:lms_password}
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:redis}
      port: ${SPRING_DATA_REDIS_PORT:6379}
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    table: marketplace_flyway_schema_history
    validate-on-migrate: false
  jpa:
    hibernate:
      ddl-auto: none

eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: marketplace-service
```

---

#### **Issue #2: Analytics Service Database Variable Mismatch**

**Severity:** 🔴 CRITICAL

**Affected Service:** lms-analytics-service

**Problem:**
- Base config (application.yml) expects: `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`
- docker-compose.yml provides: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
- **Mismatch** causes fallback to `localhost:5432`
- In Docker container, localhost:5432 doesn't exist (postgres is at `postgres:5432`)
- Service fails to connect to database

**Configuration (application.yml, lines 5-9):**
```yaml
datasource:
  url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/lms_dev}
  username: ${DB_USERNAME:postgres}
  password: ${DB_PASSWORD:postgres}
```

**docker-compose.yml (lines 245-247):**
```yaml
SPRING_DATASOURCE_URL=...
SPRING_DATASOURCE_USERNAME=...
SPRING_DATASOURCE_PASSWORD=...
```

**docker Override (application-docker.yml):**
```yaml
# This SHOULD fix it but check if it's being read correctly
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:...}
```

**But wait - Let's verify the docker profile is being used:**
```yaml
# From docker-compose.yml line 243:
SPRING_PROFILES_ACTIVE=docker,supabase
```

**Status Check:** 
- ✅ Docker profile IS active
- ✅ application-docker.yml DOES exist and uses `SPRING_DATASOURCE_URL`
- ✓ **This should work** because docker-compose provides `SPRING_DATASOURCE_*`

**Verdict:** ⚠️ POTENTIAL ISSUE if docker profile isn't loaded properly

---

#### **Issue #3: AI Service Disabled Eureka in Docker**

**Severity:** ⚠️ HIGH

**Affected Service:** lms-ai-service

**Problem:**
- application-docker.yml disables Eureka registration
- API gateway hardcodes `http://ai-service:8085` instead of using service discovery
- If AI service goes down, gateway won't know about it
- Service routing becomes fragile

**application-docker.yml (lines 29-33):**
```yaml
eureka:
  client:
    enabled: false
    register-with-eureka: false
    fetch-registry: false
```

**application-docker.yml (lines 36-38):**
```yaml
services:
  learning-service:
    url: http://learning-service:8089
```

**Problem:**
- `learning-service` hostname doesn't match container name `lms-learning-service`
- However, docker-compose env vars override this, so it works

---

#### **Issue #4: Frontend Vercel Configuration Missing BACKEND_URL**

**Severity:** 🔴 CRITICAL

**Affected File:** frontend/vercel.json

**Problem:**
- Uses `${BACKEND_URL}` environment variable
- Variable NOT defined in any `.env` example file
- Deployment to Vercel will fail without this variable
- Vercel rewrites won't work

**Configuration (vercel.json, lines 4-6):**
```json
{
  "source": "/api/:path*",
  "destination": "https://${BACKEND_URL}/api/:path*"
}
```

**Solution:**
Add to `.env.production.example`:
```
# Vercel deployment backend URL (without /api path)
# Example: api.yourdomain.com or your-backend.vercel.app
BACKEND_URL=api.your-domain.com
```

---

### 5.2 High-Priority Issues (⚠️ WARNING)

#### **Issue #5: Hardcoded localhost URLs in Application Configs**

**Severity:** ⚠️ HIGH

**Affected Files/Lines:**
- lms-user-service/application.yml:
  - Line 9: `jdbc:postgresql://localhost:5432/lms_db`
  - Line 137: `${APP_BASE_URL:https://localhost:3000}`
  - Line 140: `${EMAIL_VERIFICATION_URL:https://localhost:3000/verify-email}`
  - Line 153: `${GOOGLE_OAUTH_REDIRECT_URI:http://localhost:8080/api/auth/oauth2/google/callback}`

- lms-learning-service/application.yml:
  - Line 6: `jdbc:postgresql://localhost:5432/lms_dev`

- lms-ai-service/application.yml:
  - Line 12: `jdbc:postgresql://localhost:5432/lms_db`

- lms-analytics-service/application.yml:
  - Line 6: `jdbc:postgresql://localhost:5432/lms_dev`

- lms-marketplace-service/application.yml:
  - Line 6: `jdbc:postgresql://...localhost...`

**Problem:**
- These are fallback defaults when env vars not set
- In Docker, `localhost` doesn't route to host machine
- Services may fail if docker profiles not properly activated

**Mitigation:**
- ✅ Docker profiles DO override these values
- ✅ docker-compose.yml provides environment variables
- ⚠️ But **risky** if profile activation fails

**Recommendation:**
In docker-compose.yml, add explicit checks or ensure `SPRING_PROFILES_ACTIVE=docker` is always set.

---

#### **Issue #6: Analytics Service Flyway Disabled**

**Severity:** ⚠️ HIGH

**Affected Service:** lms-analytics-service

**Problem:**
- Flyway disabled by design: `enabled: false`
- Relies entirely on other services' migrations
- If learning-service migrations don't run, analytics breaks
- No schema versioning for analytics-specific tables

**Configuration (application.yml, line 32):**
```yaml
flyway:
  enabled: false  # Disabled - analytics reads from existing tables
```

**Impact:**
- ✅ Works if learning-service runs first and creates tables
- ⚠️ Fragile dependency
- ❌ Can't roll back analytics schema separately

**Recommendation:**
- Consider re-enabling Flyway for analytics with empty initial versions
- Or document the startup order requirement

---

### 5.3 Medium-Priority Issues (⚠️ CAUTION)

#### **Issue #7: Service Hostname vs Container Name Inconsistency**

**Severity:** ⚠️ MEDIUM

**Details:**

In Docker profiles, services specify `hostname`:
```yaml
eureka:
  instance:
    hostname: learning-service  # This is the Eureka service name
```

But docker-compose uses `container_name`:
```yaml
container_name: lms-learning-service  # This is the Docker hostname
```

**Inconsistency:**
- Gateway routes use `lb://lms-learning-service` (from Eureka)
- But container DNS resolution works by `container_name` (lms-learning-service)
- Nginx uses `http://api-gateway:8080` (container name, not Eureka name)

**Resolution:**
- ✅ Docker Bridge Network resolves by container_name
- ✅ Services register with Eureka using hostname  
- ✅ **This works because:**
  - Docker DNS: lms-learning-service:8089
  - Eureka service name: lms-learning-service
  - They match!

**But Look at AI Service:**
```yaml
# docker-compose.yml
container_name: lms-ai-service

# application-docker.yml
hostname: (not specified, should be ai-service or lms-ai-service)

# application-docker.yml routes reference:
url: http://learning-service:8089  # Uses hostname, not container_name
```

**Problem:** AI service will have mismatched hostname/container_name

---

#### **Issue #8: Inconsistent Variable Naming Across Services**

**Severity:** ⚠️ MEDIUM

**Summary:**

| Service | Uses |
|---------|------|
| user-service | `SPRING_DATASOURCE_*` |
| learning-service | `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD` |
| ai-service | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` |
| analytics-service | `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD` |
| marketplace-service | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` |

**Problem:**
- Makes environment configuration error-prone
- Harder to provide consistent docker-compose.yml
- Increased risk of connection failures

**Current Handling:**
- ✅ docker-compose.yml provides multiple variable formats
- ✅ Each service's docker profile translates appropriately

---

### 5.4 Low-Priority Issues (ℹ️ INFORMATIONAL)

#### **Issue #9: Redundant Database URL Configuration**

**Severity:** ℹ️ LOW

**Example (learning-service, docker-compose.yml, lines 148-153):**
```yaml
SPRING_DATASOURCE_URL=jdbc:postgresql://...
DATABASE_URL=jdbc:postgresql://...
DB_USERNAME=...
DB_PASSWORD=...
```

**Problem:**
- `SPRING_DATASOURCE_URL` and `DATABASE_URL` are redundant
- Config provides both but only one is used

**Impact:** None - just redundancy. Clarify documentation.

---

## 6. SUMMARY TABLE: CONNECTIVITY STATUS

| Component | Status | Issues |
|-----------|--------|--------|
| Frontend → API Gateway | ✅ Good | BACKEND_URL missing for Vercel |
| API Gateway → User Service | ✅ Good | None |
| API Gateway → Learning Service | ✅ Good | None |
| API Gateway → AI Service | ⚠️ Hardcoded | Eureka disabled, direct HTTP |
| API Gateway → Analytics Service | ✅ Good | Database var mismatch risk |
| API Gateway → Marketplace Service | ❌ Missing Profile | No docker-compose profile |
| User Service → PostgreSQL | ✅ Good | None |
| Learning Service → PostgreSQL | ✅ Good | None |
| AI Service → PostgreSQL | ✅ Good | None |
| Analytics Service → PostgreSQL | ⚠️ Risk | Flyway disabled, var mismatch |
| Marketplace Service → PostgreSQL | ❌ No Profile | Will try localhost:8761 |
| All Services → Redis | ✅ Good | None |
| All Services → Eureka | ⚠️ Partial | Marketplace missing, AI disabled |
| Nginx → API Gateway | ✅ Good | Uses container_name correctly |

---

## 7. DETAILED FIXES REQUIRED

### FIX #1: Create Marketplace Docker Profile

**File:** `/backend-spring/lms-marketplace-service/src/main/resources/application-docker.yml`

**Content:**
```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://postgres:5432/lms_db}
    username: ${SPRING_DATASOURCE_USERNAME:lms_user}
    password: ${SPRING_DATASOURCE_PASSWORD:lms_password}

  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:redis}
      port: ${SPRING_DATA_REDIS_PORT:6379}

  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    table: marketplace_flyway_schema_history
    validate-on-migrate: false

  jpa:
    hibernate:
      ddl-auto: none

eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: marketplace-service
```

---

### FIX #2: Update .env.production.example with BACKEND_URL

**File:** `.env.production.example`

**Add:**
```yaml
# ==========================================
# FRONTEND DEPLOYMENT (Vercel)
# ==========================================
# Backend API URL for Vercel rewrites
# Should be your production API domain (without /api path)
# Example: api.yourdomain.com, api.your-app.com, or your-backend.vercel.app
BACKEND_URL=api.your-domain.com
```

---

### FIX #3: Clarify Analytics Service Flyway Strategy

**Option A: Enable Flyway (Recommended)**

Modify `/backend-spring/lms-analytics-service/src/main/resources/application.yml`:
```yaml
flyway:
  enabled: true
  baseline-on-migrate: true
  baseline-version: 0
  locations: classpath:db/migration
  table: analytics_flyway_schema_history
  validate-on-migrate: true
```

**Option B: Document Dependency (Current)**

Add comment to application.yml:
```yaml
flyway:
  enabled: false
  # NOTE: Analytics service assumes learning-service has already created all shared tables.
  # Startup order: learning-service must start before analytics-service
  # See docker-compose.yml depends_on configuration
```

---

### FIX #4: Enable AI Service Eureka Registration

**Option A: Use Service Discovery (Recommended)**

Modify `/backend-spring/lms-ai-service/src/main/resources/application-docker.yml`:
```yaml
# CHANGE FROM:
eureka:
  client:
    enabled: false
    register-with-eureka: false
    fetch-registry: false

# CHANGE TO:
eureka:
  client:
    serviceUrl:
      defaultZone: ${EUREKA_URI:http://eureka-server:8761/eureka}
  instance:
    prefer-ip-address: true
    hostname: ai-service
```

And update API Gateway routes (application.yml lines 107-138):
```yaml
- id: ai-service-v1
  uri: lb://lms-ai-service  # Use load balancer instead of hardcoded URL
  
- id: ai-service
  uri: lb://lms-ai-service  # Use load balancer instead of hardcoded URL
```

**Option B: Keep Hardcoded but Document**

If using hardcoded URLs is intentional:
```yaml
# application-docker.yml
# AI service intentionally bypasses Eureka for direct, reliable routing
eureka:
  client:
    enabled: false
    register-with-eureka: false
    fetch-registry: false
```

And update docker-compose.yml:
```yaml
ai-service:
  # ... other config ...
  # Explicit dependency on API Gateway being up
  depends_on:
    api-gateway:
      condition: service_healthy
```

---

### FIX #5: Standardize Service URL References

Create common config in docker-compose.yml or document patterns:

```yaml
# Option 1: Use Eureka for all services (simplest)
# - Update application-docker.yml to enable Eureka for AI service
# - Use lb:// prefix in all gateway routes
# - Update docker-compose.yml to not pass service URLs

# Option 2: Keep current hardcoded approach but standardize
# - Standardize on LEARNING_SERVICE_URL, USER_SERVICE_URL, AI_SERVICE_URL
# - Update all services to use these consistently
# - Update application-docker.yml to use these

# Option 3: Use Docker Compose service names directly
# - Use container_name: (not lms- prefix) for service names
# - Use service names in connections
# - Update docker-compose.yml networking
```

**Recommendation:** Option 1 (Eureka for all) is cleanest long-term.

---

### FIX #6: Document Frontend Environment Setup

Add to frontend/.env.example:
```
# ==========================================
# FRONTEND VITE CONFIGURATION
# ==========================================

# API URL for client-side requests (usually relative path for production)
VITE_API_URL=/api

# AI service endpoint (through API Gateway by default)
VITE_AI_SERVICE_URL=/api/ai

# Dev server proxy target (only used during "npm run dev")
VITE_API_TARGET=http://localhost:8080

# Feature flags
VITE_REQUIRE_UCU_EMAIL=false

# Push notifications
VITE_VAPID_PUBLIC_KEY=

# ==========================================
# PRODUCTION DEPLOYMENT NOTES
# ==========================================
# For Vercel deployment:
# 1. Set BACKEND_URL in Vercel environment variables
# 2. Ensure GATEWAY_CORS_ALLOWED_ORIGINS includes your Vercel URL
# 3. Update vercel.json with correct domain
```

---

## 8. TESTING CONNECTIVITY

### 8.1 Docker Compose Startup Test

```bash
# Full system startup
docker compose --env-file .env.production up -d

# Check container health
docker compose ps

# Expected output (all healthy):
# lms-postgres              ... (healthy)
# lms-redis                 ... (healthy)
# lms-eureka-server         ... (healthy)
# lms-user-service          ... (healthy)
# lms-learning-service      ... (healthy)
# lms-ai-service            ... (healthy)
# lms-analytics-service     ... (healthy)
# lms-marketplace-service   ... (healthy)
# lms-api-gateway           ... (healthy)
# lms-frontend              ... (healthy)
```

### 8.2 Service Registration Verification

```bash
# Check Eureka dashboard
curl -s http://localhost:8761/eureka/v2/apps | grep '<name>'

# Expected services:
# lms-user-service
# lms-learning-service
# lms-ai-service (if fix #4 is applied)
# lms-analytics-service
# lms-marketplace-service
# lms-api-gateway
```

### 8.3 Database Connectivity Test

```bash
# Test user-service DB connection
docker compose exec user-service curl -s http://localhost:8081/actuator/health | grep -i status

# Test all services
for service in user-service learning-service ai-service analytics-service marketplace-service; do
  echo "=== $service ==="
  docker compose exec $service curl -s http://localhost:8081/actuator/health 2>/dev/null | jq '.status'
done
```

### 8.4 Frontend Connectivity Test

```bash
# Test API Gateway from frontend
docker compose exec frontend curl -s http://api-gateway:8080/actuator/health

# Test from localhost
curl -s http://localhost:8080/actuator/health

# Test full flow
curl -s http://localhost:3000 | head -20  # Should get HTML, not 502
```

---

## 9. RECOMMENDATIONS

### High Priority (Do First)

1. ✅ **Create marketplace-service docker profile** - Blocks deployment
2. ✅ **Add BACKEND_URL to .env.production.example** - Blocks Vercel deployment  
3. ✅ **Enable AI Service Eureka** - Improves reliability

### Medium Priority (Do Soon)

4. ⚠️ **Document Analytics Flyway dependency** - Clarify startup order
5. ⚠️ **Standardize database variable naming** - Reduce configuration errors
6. ⚠️ **Document service hostname vs container_name mapping** - Easier troubleshooting

### Low Priority (Nice to Have)

7. ℹ️ **Remove redundant DB URL variables** - Simplify configuration
8. ℹ️ **Add startup order documentation** - Prevent confusion
9. ℹ️ **Create docker-compose health check dashboard** - Monitoring

---

## 10. CONCLUSION

The LearnSystem architecture demonstrates solid microservices patterns with Spring Cloud Gateway and Eureka service discovery. The frontend-to-backend connection is well-designed with proper proxy configuration and CORS settings.

**Critical Issues Found:** 3
- Marketplace service missing docker profile
- Frontend Vercel configuration incomplete
- Analytics database variable mismatch risk

**High-Priority Issues:** 2
- AI service Eureka disabled
- Flyway disabled for analytics

**Medium-Priority Issues:** 3
- Service naming inconsistencies
- Variable naming standardization
- Documentation gaps

**Overall Assessment:** System is **production-ready** with fixes for identified issues. The redundancies and fallbacks provide good fault tolerance, but the critical issues must be resolved before production deployment.

---

## APPENDIX: File Manifest

### Frontend Files
- `/frontend/src/api/client.ts` - API client with JWT refresh
- `/frontend/vite.config.ts` - Development proxy configuration
- `/frontend/vercel.json` - Vercel deployment rewrites
- `/frontend/.env.example` - Frontend environment template
- `/frontend/nginx.conf` - Docker nginx proxy configuration
- `/frontend/Dockerfile` - Multi-stage frontend build

### Backend Configuration Files
- `/backend-spring/lms-api-gateway/src/main/resources/application.yml`
- `/backend-spring/lms-api-gateway/src/main/resources/application-docker.yml`
- `/backend-spring/lms-user-service/src/main/resources/application*.yml` (4 files)
- `/backend-spring/lms-learning-service/src/main/resources/application*.yml` (3 files)
- `/backend-spring/lms-ai-service/src/main/resources/application*.yml` (3 files)
- `/backend-spring/lms-analytics-service/src/main/resources/application*.yml` (3 files)
- `/backend-spring/lms-marketplace-service/src/main/resources/application.yml` (1 file - missing docker)

### Database Migration Files
- Learning Service: 25+ migrations
- User Service: Multiple migrations
- AI Service: 3 migrations
- Marketplace Service: 1 migration
- Analytics Service: 1 migration (disabled)

### Docker/Deployment Files
- `/docker-compose.yml` - Full stack composition
- `/.env.example` - Environment template
- `/.env.production.example` - Production environment template

___BEGIN___COMMAND_DONE_MARKER___0
