# ARCHITECTURAL AUDIT REPORT
## LearnSystemUCU - AI-Integrated Learning Management System

**Audit Date:** December 19, 2025  
**Auditor Role:** Principal Software Architect & AI Systems Engineer  
**System:** React + Spring Boot Microservices + LLM Integration

---

## 1. EXECUTIVE VERDICT

### **VERDICT: CONDITIONAL PASS — Requires Critical Remediation**

The architecture is **fundamentally sound** for an MVP but **NOT production-grade** without addressing critical gaps.

**High-Level Justification:**
- ✅ **CORRECT:** Microservices decomposition, API Gateway pattern, service discovery, domain separation
- ✅ **CORRECT:** Clean layered architecture in backend services (Controller → Service → Repository → Domain)
- ✅ **CORRECT:** AI service isolation with dedicated module
- ⚠️ **WARNING:** No resilience patterns (Circuit Breakers) — will fail at scale
- ⚠️ **WARNING:** No message broker — tight synchronous coupling between services
- ❌ **CRITICAL:** Frontend lacks server-state management (no React Query/TanStack Query)
- ❌ **CRITICAL:** AI observability is non-existent — no logging of prompts/responses/latencies
- ❌ **CRITICAL:** AI failure handling is primitive (basic retry only)
- ❌ **CRITICAL:** No event-driven architecture for cross-service communication

**Production Readiness Score: 62/100**

---

## 2. FRONTEND AUDIT (React)

### 2.1 What Is CORRECT

| Aspect | Assessment |
|--------|------------|
| **Component Structure** | Clean separation: `pages/`, `components/`, `api/`, `store/`, `types/` |
| **State Management** | Zustand for client state — appropriate and lightweight |
| **Routing** | React Router v6 with proper `PrivateRoute` guards |
| **i18n** | Multi-language support (uk/en) via i18next — well integrated |
| **API Client** | Centralized axios client with interceptors, token refresh, error normalization |
| **Type Safety** | TypeScript with defined interfaces in `types/` |
| **AI Components** | Dedicated AI components (`AIContentGenerator`, `AIAssistantPanel`, `AIContentEditor`) |
| **Streaming Support** | EventSource (SSE) for AI streaming — correct pattern |

### 2.2 What Is BROKEN

| Issue | Severity | Description |
|-------|----------|-------------|
| **No React Query** | 🔴 CRITICAL | All data fetching uses raw `fetch`/axios with manual `useState`/`useEffect`. No caching, deduplication, background refetch, or stale-while-revalidate. |
| **Mixed API Patterns** | 🟡 HIGH | Some components use `apiClient`, others use raw `fetch` (e.g., `AIContentGenerator.tsx` line 40). Inconsistent. |
| **No Error Boundaries** | 🟡 HIGH | AI streaming errors can crash components. No React Error Boundaries. |
| **No Loading States Architecture** | 🟡 HIGH | Each store has its own `isLoading` flags. No unified loading/suspense strategy. |
| **AI Retry Logic Missing** | 🟡 HIGH | Frontend has no retry with exponential backoff for AI calls (only backend has retry). |
| **No Optimistic Updates** | 🟠 MEDIUM | Grade submissions, enrollments don't use optimistic updates — poor UX. |
| **Hardcoded AI URL** | 🟠 MEDIUM | `AI_BASE_URL` in `api/ai.ts` defaults to hardcoded localhost — deployment issue. |

### 2.3 What MUST Be Changed

1. **MANDATORY: Integrate TanStack Query (React Query)**
   ```
   Install: @tanstack/react-query
   Wrap App in QueryClientProvider
   Convert all data fetching to useQuery/useMutation hooks
   ```

2. **MANDATORY: Unify API Layer**
   - Remove all raw `fetch()` calls
   - All HTTP goes through `apiClient`
   - Create typed query hooks: `useCoursesQuery()`, `useAIGenerationMutation()`

3. **MANDATORY: Add Error Boundaries**
   ```
   Create: components/ErrorBoundary.tsx
   Wrap AI components and route-level pages
   Implement fallback UI for failed AI operations
   ```

4. **MANDATORY: Implement AI-Specific Hooks**
   ```
   hooks/useAIGeneration.ts — with retry, abort, progress tracking
   hooks/useAIStreaming.ts — SSE wrapper with reconnection logic
   ```

5. **REQUIRED: Move Environment Config**
   - All API URLs via `REACT_APP_*` environment variables only
   - No fallback to localhost in production builds

---

## 3. BACKEND AUDIT (Spring Boot)

### 3.1 What Is CORRECT

| Aspect | Assessment |
|--------|------------|
| **Microservices Decomposition** | 10 services with clear domain boundaries |
| **Service Discovery** | Eureka Server + client registration — correct |
| **API Gateway** | Spring Cloud Gateway with path-based routing — correct |
| **Layered Architecture** | `web/` → `service/` → `repository/` → `domain/` per service |
| **Domain Modeling** | Rich entities (Course, Module, User) with JPA annotations |
| **Security** | JWT-based auth, centralized in `lms-common`, shared filters |
| **Caching** | Spring Cache abstraction with `@Cacheable` on services |
| **Database** | PostgreSQL with Flyway migrations |
| **Shared Module** | `lms-common` for DTOs, exceptions, security — DRY |
| **Feign Clients** | Inter-service communication with typed clients |
| **Observability Setup** | Prometheus + Grafana + Zipkin configured |

### 3.2 What Is BROKEN

| Issue | Severity | Description |
|-------|----------|-------------|
| **No Circuit Breakers** | 🔴 CRITICAL | Zero usage of Resilience4j or Hystrix. Service failures cascade. |
| **No Message Broker** | 🔴 CRITICAL | All inter-service communication is synchronous HTTP. Events use Spring `@EventListener` (in-JVM only). |
| **Inconsistent Feign Client Config** | 🟡 HIGH | Some use `url = "${...}"` (hardcoded), others use service discovery. Mixed patterns. |
| **Thread-Based Async in AI** | 🟡 HIGH | `StreamingGenerationService` uses `new Thread()` — should use `@Async` with proper executor. |
| **Missing API Versioning** | 🟡 HIGH | All endpoints are `/api/...` — no version prefix (`/api/v1/`). |
| **No Saga Pattern** | 🟠 MEDIUM | Multi-service transactions (course creation with AI) have no rollback coordination. |
| **No Rate Limiting on Gateway** | 🟠 MEDIUM | AI endpoints can be abused — no gateway-level throttling. |
| **Shared Database** | 🟠 MEDIUM | All services share one PostgreSQL instance — violates database-per-service. |

### 3.3 What MUST Be Changed

1. **MANDATORY: Add Resilience4j Circuit Breakers**
   ```xml
   <!-- Add to pom.xml -->
   <dependency>
     <groupId>io.github.resilience4j</groupId>
     <artifactId>resilience4j-spring-boot3</artifactId>
   </dependency>
   ```
   Apply to:
   - All Feign clients
   - AI API calls (LlamaApiService)
   - Cross-service calls

2. **MANDATORY: Introduce Message Broker**
   ```
   Add: Apache Kafka or RabbitMQ
   Events to publish:
   - CourseCreatedEvent
   - SubmissionGradedEvent
   - AIContentGeneratedEvent
   - UserEnrolledEvent
   ```

3. **MANDATORY: Standardize Feign Clients**
   - All clients MUST use service discovery names, not hardcoded URLs
   - Pattern: `@FeignClient(name = "lms-course-service")`
   - Remove all `url = "${...}"` configurations

4. **MANDATORY: Fix Async Execution**
   - Replace `new Thread()` with `@Async` + `CompletableFuture`
   - Configure `ThreadPoolTaskExecutor` with bounded queues

5. **MANDATORY: Add API Versioning**
   - All endpoints: `/api/v1/...`
   - Configure at controller level with `@RequestMapping("/api/v1/...")`

6. **REQUIRED: Add Gateway Rate Limiting**
   ```yaml
   spring:
     cloud:
       gateway:
         routes:
           - id: ai-service
             filters:
               - name: RequestRateLimiter
                 args:
                   redis-rate-limiter.replenishRate: 10
                   redis-rate-limiter.burstCapacity: 20
   ```

---

## 4. AI ARCHITECTURE AUDIT

### 4.1 Current AI Integration Quality: **INSUFFICIENT**

| Aspect | Current State | Required State |
|--------|---------------|----------------|
| **LLM Client** | Single Groq/Llama API via WebClient | Multi-provider abstraction (OpenAI, Anthropic, Groq) |
| **Prompt Management** | Inline string builders | Versioned prompt templates with hot reload |
| **Caching** | Simple key-value cache | Semantic cache with embedding similarity |
| **Streaming** | SSE with manual Thread | Reactive Flux with proper backpressure |
| **Observability** | Basic logging | Full request/response logging, latency metrics, cost tracking |
| **Failure Handling** | Retry with backoff | Retry + Fallback + Circuit Breaker + Timeout |
| **Context Management** | Per-request only | Conversation history, user learning profile |

### 4.2 Critical Flaws

1. **No AI Observability**
   - Prompts are not logged (security-conscious logging is fine)
   - No metrics: tokens used, latency, cost, cache hit rate
   - No tracing of AI decision paths

2. **Primitive Error Handling**
   - `RuntimeException` thrown on AI failure
   - No graceful degradation (e.g., return cached/default content)
   - No distinction between transient and permanent failures

3. **No Context/Memory Management**
   - Each request is stateless
   - No user learning history integration
   - No course context awareness

4. **Prediction Service is Naive**
   - `PredictionService.java` uses simple linear regression in Java
   - Should use actual ML model or LLM-based analysis

5. **No Prompt Versioning**
   - Prompts are hardcoded in `CourseGenerationService`
   - No A/B testing capability
   - No prompt audit trail

### 4.3 Required AI Architecture Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI ORCHESTRATION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Prompt    │  │   Context   │  │   Response              │  │
│  │   Registry  │  │   Manager   │  │   Processor             │  │
│  │             │  │             │  │   (validation, safety)  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────▼────────────────▼──────────────────────▼──────────────┐│
│  │                    AI GATEWAY                                ││
│  │  - Provider abstraction (OpenAI, Anthropic, Groq)           ││
│  │  - Circuit breaker per provider                              ││
│  │  - Automatic failover                                        ││
│  │  - Cost tracking                                             ││
│  └──────────────────────────┬──────────────────────────────────┘│
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────────┐│
│  │                 OBSERVABILITY LAYER                          ││
│  │  - Prompt/response logging (PII-scrubbed)                   ││
│  │  - Latency histograms                                        ││
│  │  - Token usage metrics                                       ││
│  │  - Decision audit log                                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**MANDATORY AI Components to Add:**

1. **AIGateway** — Provider-agnostic LLM interface with failover
2. **PromptRegistry** — Versioned templates, loaded from DB or config
3. **AIMetricsCollector** — Prometheus metrics for AI calls
4. **AIAuditLogger** — Structured logging for compliance
5. **SemanticCache** — Redis + vector similarity for response caching

---

## 5. CANONICAL TARGET ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENTS                                      │
│                    React SPA (TanStack Query + Zustand)                      │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (Spring Cloud)                         │
│  - Rate Limiting (Redis)                                                     │
│  - JWT Validation                                                            │
│  - Request Routing                                                           │
│  - API Versioning (/api/v1/*)                                               │
└────────┬──────────────┬──────────────┬──────────────┬──────────────┬────────┘
         │              │              │              │              │
         ▼              ▼              ▼              ▼              ▼
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│   USER     │  │  COURSE    │  │ ASSESSMENT │  │ GRADEBOOK  │  │  DEADLINE  │
│  SERVICE   │  │  SERVICE   │  │  SERVICE   │  │  SERVICE   │  │  SERVICE   │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │               │               │
      └───────────────┴───────────────┴───────┬───────┴───────────────┘
                                              │
                                              ▼
                            ┌─────────────────────────────────┐
                            │        MESSAGE BROKER           │
                            │    (Apache Kafka / RabbitMQ)    │
                            │                                 │
                            │  Topics:                        │
                            │  - course.created               │
                            │  - submission.graded            │
                            │  - ai.content.generated         │
                            │  - user.enrolled                │
                            │  - analytics.event              │
                            └───────────────┬─────────────────┘
                                            │
         ┌──────────────────────────────────┼──────────────────────────────────┐
         │                                  │                                  │
         ▼                                  ▼                                  ▼
┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
│    AI SERVICE      │         │  ANALYTICS SERVICE │         │ NOTIFICATION SVC   │
│                    │         │                    │         │                    │
│  ┌──────────────┐  │         │  - Event consumer  │         │  - Email           │
│  │ AI Gateway   │  │         │  - Aggregations    │         │  - Push            │
│  │ (multi-LLM)  │  │         │  - Predictions     │         │  - In-app          │
│  ├──────────────┤  │         │  - Reports         │         │                    │
│  │ Prompt Reg.  │  │         │                    │         │                    │
│  ├──────────────┤  │         │                    │         │                    │
│  │ AI Metrics   │  │         │                    │         │                    │
│  └──────────────┘  │         │                    │         │                    │
└────────────────────┘         └────────────────────┘         └────────────────────┘
         │
         ▼
┌────────────────────┐
│   LLM PROVIDERS    │
│  - Groq            │
│  - OpenAI          │
│  - Anthropic       │
│  (with failover)   │
└────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                       │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   PostgreSQL    │      Redis      │  Elasticsearch  │   Vector DB           │
│   (per-service) │   (cache/       │   (search/logs) │   (semantic cache)    │
│                 │    sessions)    │                 │                       │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILITY                                      │
│   Prometheus  │  Grafana  │  Zipkin  │  ELK Stack  │  AI Decision Logs      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module Ownership Matrix

| Module | Owns | Publishes Events | Consumes Events |
|--------|------|------------------|-----------------|
| **User Service** | Users, Auth, Profiles | `user.created`, `user.updated` | — |
| **Course Service** | Courses, Modules, Resources, Enrollments | `course.created`, `user.enrolled` | `ai.content.generated` |
| **Assessment Service** | Assignments, Quizzes, Questions, Submissions | `submission.created`, `submission.graded` | `user.enrolled` |
| **Gradebook Service** | Grades, Summaries | `grade.updated` | `submission.graded` |
| **Deadline Service** | Calendar, Deadlines, Reminders | `deadline.approaching` | `course.created`, `submission.created` |
| **AI Service** | AI Generation, Predictions | `ai.content.generated`, `ai.prediction.made` | `course.created` (for context) |
| **Analytics Service** | Metrics, Reports, Insights | — | ALL events (read model) |
| **Notification Service** | Email, Push, In-app messages | — | `deadline.approaching`, `grade.updated` |

---

## 6. MANDATORY REFACTORING PLAN

### Phase 1: Critical Infrastructure (Week 1-2)

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Add Resilience4j to all Feign clients | 2 days |
| P0 | Introduce Kafka/RabbitMQ for async events | 3 days |
| P0 | Migrate `@EventListener` to message broker | 2 days |
| P0 | Add TanStack Query to frontend | 3 days |

### Phase 2: AI Hardening (Week 3-4)

| Priority | Task | Effort |
|----------|------|--------|
| P1 | Create AIGateway with multi-provider support | 3 days |
| P1 | Implement PromptRegistry with DB storage | 2 days |
| P1 | Add AI metrics (Micrometer + Prometheus) | 2 days |
| P1 | Fix `StreamingGenerationService` async pattern | 1 day |
| P1 | Add AI audit logging | 1 day |

### Phase 3: API & Security (Week 5)

| Priority | Task | Effort |
|----------|------|--------|
| P2 | Add API versioning (`/api/v1/`) | 1 day |
| P2 | Implement gateway rate limiting | 1 day |
| P2 | Standardize all Feign clients to service discovery | 1 day |
| P2 | Add Error Boundaries to React | 1 day |

### Phase 4: Scalability Prep (Week 6+)

| Priority | Task | Effort |
|----------|------|--------|
| P3 | Database per service (evaluate) | 5 days |
| P3 | Semantic caching for AI | 3 days |
| P3 | User learning context/memory | 3 days |
| P3 | A/B testing for prompts | 2 days |

---

## 7. RISK ASSESSMENT

### 7.1 What Will Break at Scale

| Risk | Trigger Point | Impact | Mitigation |
|------|---------------|--------|------------|
| **Cascading Failures** | Any downstream service goes down | Full system outage | Circuit breakers (Resilience4j) |
| **Database Bottleneck** | >1000 concurrent users | Slow queries, timeouts | Database per service, read replicas |
| **AI Rate Limits** | >100 AI requests/min | 429 errors, degraded UX | Multi-provider failover, semantic caching |
| **Synchronous Coupling** | Burst traffic | Timeout chains | Message broker for async |
| **Memory Pressure** | Large AI responses streamed | OOM in services | Backpressure, chunked responses |

### 7.2 What Will Break with More AI Features

| Risk | Trigger | Impact | Mitigation |
|------|---------|--------|------------|
| **Prompt Sprawl** | >20 prompt types | Inconsistency, hard to maintain | Centralized PromptRegistry |
| **Context Explosion** | Long conversations | Token limit exceeded | Context truncation/summarization |
| **Cost Explosion** | Heavy AI usage | Unexpected bills | Cost tracking, usage quotas per user |
| **Hallucination Impact** | AI generates incorrect content | Academic integrity issues | Human-in-the-loop validation |
| **Latency Variance** | Complex prompts | 30s+ response times | Streaming + progress indicators |

### 7.3 Long-Term Maintenance Pain

| Issue | Why It Will Hurt | Solution |
|-------|------------------|----------|
| **Inline Prompts** | Every change requires code deploy | External prompt storage |
| **Mixed State Management** | Debug complexity, race conditions | Unified React Query + Zustand boundary |
| **No API Versioning** | Breaking changes affect all clients | Version from day 1 |
| **Single Shared DB** | Schema migrations block all services | Eventual database split |
| **No AI Decisions Audit** | Cannot explain AI behavior | Structured decision logging |

---

## 8. FINAL RECOMMENDATIONS

### MUST DO (Blockers for Production)
1. ✅ Add Circuit Breakers
2. ✅ Add Message Broker
3. ✅ Add TanStack Query
4. ✅ Add AI Observability
5. ✅ Add Error Boundaries

### SHOULD DO (Within 3 Months)
1. API Versioning
2. Gateway Rate Limiting
3. Multi-LLM Provider Support
4. Semantic Caching for AI
5. Prompt Versioning System

### COULD DO (6+ Months)
1. Database per Service
2. Vector Database for Learning Context
3. ML-based Predictions (replace naive Java implementation)
4. A/B Testing Framework for Prompts

---

**Report Prepared By:** AI Systems Architecture Audit  
**Confidence Level:** High (based on full codebase review)  
**Next Review:** After Phase 2 completion

