# ARCHITECTURAL EXECUTION PLAN
## LearnSystemUCU - Production Transformation

**Execution Authority:** Principal Software Architect  
**Effective Date:** December 19, 2025  
**Status:** ACTIVE - Implementation Required

---

## 1. AUDIT → ACTION MAPPING

### Critical (P0) - Must Complete Before Any Deployment

| Audit Finding | Concrete Action |
|--------------|-----------------|
| No Circuit Breakers | Add Resilience4j to all Feign clients and AI API calls |
| No Message Broker | Integrate Apache Kafka for async event-driven communication |
| No React Query | Install @tanstack/react-query, refactor all data fetching |
| No Error Boundaries | Create ErrorBoundary components, wrap AI and page components |
| Thread-Based Async in AI | Replace `new Thread()` with `@Async` and `CompletableFuture` |
| AI Failure Handling Primitive | Implement Circuit Breaker + Fallback + Timeout for AI calls |
| No AI Observability | Add Micrometer metrics + structured prompt logging |

### High (P1) - Complete Within 4 Weeks

| Audit Finding | Concrete Action |
|--------------|-----------------|
| Mixed API Patterns in Frontend | Remove all raw `fetch()`, route through `apiClient` |
| Hardcoded AI_BASE_URL | Move to `REACT_APP_*` environment variables only |
| No API Versioning | Add `/api/v1/` prefix to all endpoints |
| No Gateway Rate Limiting | Add Redis-based rate limiter to API Gateway |
| Inconsistent Feign Client Config | Standardize to service discovery names only |
| No Prompt Versioning | Create PromptRegistry with database-backed templates |

### Medium (P2) - Complete Within 8 Weeks

| Audit Finding | Concrete Action |
|--------------|-----------------|
| No Optimistic Updates | Implement optimistic mutations for grades, enrollments |
| No Loading States Architecture | Implement React Suspense + Query loading patterns |
| Single Shared Database | Design database-per-service migration path |
| No AI Context Management | Implement user learning profile context injection |

---

## 2. TARGET ARCHITECTURE (FINAL STATE)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│              React SPA (TanStack Query + Zustand + Error Boundaries)        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ hooks/           │ queries/           │ components/                   │  │
│  │ useAIGeneration  │ useCourseQuery     │ ErrorBoundary                │  │
│  │ useAIStreaming   │ useAssessmentQuery │ AIErrorFallback              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Spring Cloud Gateway)                       │
│                                                                             │
│  • Rate Limiting (Redis RequestRateLimiter)                                │
│  • JWT Validation                                                           │
│  • Route: /api/v1/users/** → lms-user-service                              │
│  • Route: /api/v1/courses/** → lms-course-service                          │
│  • Route: /api/v1/ai/** → lms-ai-service                                   │
│  • Circuit Breaker per route                                               │
└──────────┬────────────┬────────────┬────────────┬────────────┬─────────────┘
           │            │            │            │            │
           ▼            ▼            ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ USER SERVICE │ │COURSE SERVICE│ │ASSESSMENT SVC│ │GRADEBOOK SVC │ │DEADLINE SVC  │
│              │ │              │ │              │ │              │ │              │
│ @CircuitBreaker│ @CircuitBreaker│ @CircuitBreaker│ @CircuitBreaker│ @CircuitBreaker│
│ @FeignClient │ │ @FeignClient │ │ @FeignClient │ │ @FeignClient │ │ @FeignClient │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │                │
       └────────────────┴────────────────┴───────┬────────┴────────────────┘
                                                 │
                                                 ▼
                      ┌─────────────────────────────────────────┐
                      │           APACHE KAFKA                   │
                      │                                          │
                      │  Topics:                                 │
                      │  • lms.course.created                    │
                      │  • lms.submission.graded                 │
                      │  • lms.ai.content.generated              │
                      │  • lms.user.enrolled                     │
                      │  • lms.deadline.approaching              │
                      │  • lms.analytics.event                   │
                      └───────────────┬─────────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   AI SERVICE     │     │ ANALYTICS SERVICE│     │ NOTIFICATION SVC │
│                  │     │                  │     │   (Future)       │
│ ┌──────────────┐ │     │ @KafkaListener   │     │                  │
│ │ AIGateway    │ │     │ Event aggregation│     │                  │
│ │ (multi-LLM)  │ │     │ Predictions      │     │                  │
│ ├──────────────┤ │     │                  │     │                  │
│ │PromptRegistry│ │     │                  │     │                  │
│ ├──────────────┤ │     │                  │     │                  │
│ │ AIMetrics    │ │     │                  │     │                  │
│ │(Micrometer)  │ │     │                  │     │                  │
│ ├──────────────┤ │     │                  │     │                  │
│ │CircuitBreaker│ │     │                  │     │                  │
│ └──────────────┘ │     │                  │     │                  │
└────────┬─────────┘     └──────────────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│  LLM PROVIDERS   │
│  • Groq (primary)│
│  • OpenAI (fallback)│
│  Circuit Breaker │
│  Auto-failover   │
└──────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                     │
├─────────────────┬──────────────────┬───────────────────────────────────────┤
│   PostgreSQL    │      Redis       │         Prometheus + Grafana           │
│   (shared DB)   │  (cache/rate-    │         + Zipkin (tracing)            │
│                 │   limiting)      │         + AI Metrics Dashboard         │
└─────────────────┴──────────────────┴───────────────────────────────────────┘
```

### Module Ownership (Event-Driven)

| Service | Owns | Publishes | Consumes |
|---------|------|-----------|----------|
| User Service | Users, Auth | `user.created`, `user.updated` | - |
| Course Service | Courses, Modules, Enrollments | `course.created`, `user.enrolled` | `ai.content.generated` |
| Assessment Service | Assignments, Quizzes, Submissions | `submission.created`, `submission.graded` | `user.enrolled` |
| Gradebook Service | Grades | `grade.updated` | `submission.graded` |
| Deadline Service | Deadlines, Reminders | `deadline.approaching` | `course.created` |
| AI Service | AI Generation | `ai.content.generated` | `course.created` (context) |
| Analytics Service | Metrics, Reports | - | ALL events (read model) |

---

## 3. FRONTEND REFACTORING PLAN (React)

### 3.1 Target Folder Structure

```
frontend/src/
├── App.tsx
├── index.tsx
├── index.css
│
├── api/
│   ├── client.ts                    # Axios instance (KEEP)
│   ├── queryClient.ts               # NEW: TanStack Query client config
│   └── endpoints/
│       ├── courses.ts               # Typed API endpoints
│       ├── assessments.ts
│       ├── users.ts
│       └── ai.ts                    # AI endpoints (no hardcoded URLs)
│
├── queries/                          # NEW: React Query hooks
│   ├── useCourseQueries.ts
│   ├── useAssessmentQueries.ts
│   ├── useUserQueries.ts
│   └── useAIQueries.ts
│
├── mutations/                        # NEW: React Query mutations
│   ├── useCourseMutations.ts
│   ├── useAssessmentMutations.ts
│   └── useAIMutations.ts
│
├── hooks/                            # NEW: Custom hooks
│   ├── useAIGeneration.ts           # AI generation with retry/abort
│   ├── useAIStreaming.ts            # SSE wrapper with reconnection
│   └── useOptimisticUpdate.ts       # Optimistic update helper
│
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Loading.tsx
│   │   └── ErrorBoundary.tsx        # NEW: Error boundary
│   │
│   ├── ai/                          # AI-specific components
│   │   ├── AIAssistantPanel.tsx
│   │   ├── AIContentEditor.tsx
│   │   ├── AIContentGenerator.tsx
│   │   ├── AICourseGenerator.tsx
│   │   ├── AIElementGenerator.tsx
│   │   ├── AIErrorFallback.tsx      # NEW: AI-specific fallback UI
│   │   └── AILoadingState.tsx       # NEW: AI loading indicator
│   │
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   │
│   ├── course/
│   │   ├── CourseGradesTab.tsx
│   │   ├── CourseMembersTab.tsx
│   │   └── ...
│   │
│   └── analytics/
│       └── ...
│
├── pages/                            # Keep existing structure
│
├── store/                            # Zustand - CLIENT state only
│   ├── authStore.ts                 # Auth state (keep)
│   ├── uiStore.ts                   # UI state (keep)
│   └── notificationStore.ts         # Notifications (keep)
│   # REMOVE: courseStore.ts (→ React Query)
│   # REMOVE: userSlice.ts (→ React Query)
│
├── types/                            # TypeScript interfaces
│   ├── course.ts
│   ├── assessment.ts
│   ├── user.ts
│   ├── ai.ts
│   └── api.ts                       # NEW: API response types
│
├── i18n/                             # Keep existing
│
└── utils/                            # Keep existing
```

### 3.2 Key Refactors

#### 3.2.1 Install TanStack Query
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

#### 3.2.2 Create Query Client (`api/queryClient.ts`)
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      cacheTime: 30 * 60 * 1000,   // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

#### 3.2.3 Create Error Boundary (`components/common/ErrorBoundary.tsx`)
```typescript
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-semibold">Something went wrong</h2>
          <p className="text-red-600 text-sm">{this.state.error?.message}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

#### 3.2.4 Create AI Streaming Hook (`hooks/useAIStreaming.ts`)
```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { getAccessToken } from '../api/token';

interface UseAIStreamingOptions {
  onProgress?: (event: AIProgressEvent) => void;
  onComplete?: (data: any) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
}

export function useAIStreaming(url: string, options: UseAIStreamingOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = options.maxRetries ?? 3;

  const connect = useCallback((body: any) => {
    setIsStreaming(true);
    setError(null);
    setProgress(0);

    const token = getAccessToken();
    const fullUrl = `${url}?token=${encodeURIComponent(token || '')}`;
    
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.percentage) setProgress(data.percentage);
        options.onProgress?.(data);
        
        if (data.eventType === 'complete') {
          options.onComplete?.(data.data);
          eventSource.close();
          setIsStreaming(false);
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = (e) => {
      eventSource.close();
      
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => connect(body), delay);
      } else {
        const err = new Error('AI streaming connection failed');
        setError(err);
        options.onError?.(err);
        setIsStreaming(false);
      }
    };
  }, [url, options, maxRetries]);

  const abort = useCallback(() => {
    eventSourceRef.current?.close();
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  return { connect, abort, isStreaming, progress, error };
}
```

#### 3.2.5 Migrate AI Components to Use apiClient

**Before (AIContentGenerator.tsx line 40):**
```typescript
const response = await fetch(endpoint, { ... });
```

**After:**
```typescript
const response = await apiClient.post(endpoint, requestBody);
```

#### 3.2.6 Remove Hardcoded URLs (`api/ai.ts`)

**Before:**
```typescript
const AI_BASE_URL = process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8085/api/ai';
```

**After:**
```typescript
const AI_BASE_URL = process.env.REACT_APP_AI_SERVICE_URL;
if (!AI_BASE_URL) {
  throw new Error('REACT_APP_AI_SERVICE_URL environment variable is required');
}
```

---

## 4. BACKEND REFACTORING PLAN (Spring Boot)

### 4.1 Target Package Structure (Per Service)

```
lms-ai-service/src/main/java/com/university/lms/ai/
├── AiServiceApplication.java
│
├── config/
│   ├── LlamaApiProperties.java          # Existing
│   ├── WebClientConfig.java             # Existing
│   ├── AsyncConfig.java                 # NEW: Thread pool config
│   ├── Resilience4jConfig.java          # NEW: Circuit breaker config
│   └── KafkaConfig.java                 # NEW: Kafka producer config
│
├── domain/
│   ├── entity/
│   │   ├── PromptTemplate.java          # NEW: Versioned prompts
│   │   └── AIGenerationLog.java         # NEW: Audit log entity
│   └── event/
│       ├── AIContentGeneratedEvent.java # NEW: Domain event
│       └── AIGenerationFailedEvent.java # NEW: Failure event
│
├── dto/
│   ├── CourseGenerationRequest.java     # Existing
│   ├── AIProgressEvent.java             # Existing
│   └── ...
│
├── infrastructure/                       # NEW: Infrastructure layer
│   ├── llm/
│   │   ├── LLMProvider.java             # NEW: Provider interface
│   │   ├── GroqProvider.java            # NEW: Groq implementation
│   │   ├── OpenAIProvider.java          # NEW: OpenAI fallback
│   │   └── AIGateway.java               # NEW: Multi-provider router
│   ├── messaging/
│   │   └── KafkaEventPublisher.java     # NEW: Event publisher
│   └── metrics/
│       └── AIMetricsCollector.java      # NEW: Prometheus metrics
│
├── repository/
│   ├── PromptTemplateRepository.java    # NEW
│   └── AIGenerationLogRepository.java   # NEW
│
├── service/
│   ├── AIGenerationCacheService.java    # Existing
│   ├── ContentGenerationService.java    # Existing
│   ├── CourseGenerationService.java     # REFACTOR: Use AIGateway
│   ├── CoursePersistenceService.java    # Existing
│   ├── PredictionService.java           # Existing
│   ├── StreamingGenerationService.java  # REFACTOR: Use @Async
│   ├── TemplateService.java             # Existing
│   └── PromptRegistryService.java       # NEW: Prompt management
│
└── web/
    └── controller/
        └── AIController.java            # REFACTOR: /api/v1/ai/**
```

### 4.2 Dependency Additions

Add to `lms-ai-service/pom.xml`:

```xml
<!-- Resilience4j Circuit Breaker -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
    <version>2.2.0</version>
</dependency>
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-reactor</artifactId>
    <version>2.2.0</version>
</dependency>

<!-- Kafka -->
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>

<!-- Micrometer for AI metrics -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

Add to parent `pom.xml` properties:
```xml
<resilience4j.version>2.2.0</resilience4j.version>
```

### 4.3 Key Backend Refactors

#### 4.3.1 Fix StreamingGenerationService - Replace `new Thread()` with `@Async`

**Current (BROKEN):**
```java
new Thread(() -> {
    // generation logic
}).start();
```

**Target:**
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class StreamingGenerationService {

    private final CourseGenerationService courseGenerationService;
    private final ApplicationEventPublisher eventPublisher;

    @Async("aiTaskExecutor")
    public CompletableFuture<Void> generateCourseAsync(
            CourseGenerationRequest request,
            Sinks.Many<AIProgressEvent> sink) {
        
        return CompletableFuture.runAsync(() -> {
            try {
                sink.tryEmitNext(AIProgressEvent.progress("Initializing...", 5));
                
                GeneratedCourseResponse response = courseGenerationService.generateCourse(request);
                
                sink.tryEmitNext(AIProgressEvent.data("course", response.getCourse()));
                sink.tryEmitNext(AIProgressEvent.complete("Generation complete!"));
                sink.tryEmitComplete();
                
            } catch (Exception e) {
                log.error("Error during streaming generation", e);
                sink.tryEmitNext(AIProgressEvent.error(e.getMessage()));
                sink.tryEmitError(e);
            }
        });
    }
}
```

#### 4.3.2 Create AsyncConfig
```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("aiTaskExecutor")
    public TaskExecutor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("ai-gen-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

#### 4.3.3 Add Circuit Breaker to LlamaApiService

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class LlamaApiService {

    private final WebClient llamaWebClient;
    private final LlamaApiProperties properties;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    @CircuitBreaker(name = "llamaApi", fallbackMethod = "generateFallback")
    @Retry(name = "llamaApi")
    @TimeLimiter(name = "llamaApi")
    public CompletableFuture<String> generate(String prompt, String systemPrompt) {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                String result = doGenerate(prompt, systemPrompt);
                sample.stop(Timer.builder("ai.generation.latency")
                    .tag("provider", "groq")
                    .tag("status", "success")
                    .register(meterRegistry));
                return result;
            } catch (Exception e) {
                sample.stop(Timer.builder("ai.generation.latency")
                    .tag("provider", "groq")
                    .tag("status", "failure")
                    .register(meterRegistry));
                throw e;
            }
        });
    }

    public CompletableFuture<String> generateFallback(
            String prompt, String systemPrompt, Exception e) {
        log.warn("Circuit breaker fallback triggered for Llama API", e);
        meterRegistry.counter("ai.generation.fallback", "provider", "groq").increment();
        
        // Return cached response or throw controlled exception
        throw new AIServiceUnavailableException(
            "AI service temporarily unavailable. Please try again later.");
    }
}
```

#### 4.3.4 Create AI Metrics Collector

```java
@Component
@RequiredArgsConstructor
public class AIMetricsCollector {

    private final MeterRegistry meterRegistry;

    public void recordGeneration(String type, String provider, long latencyMs, boolean success) {
        Timer.builder("ai.generation.duration")
            .tag("type", type)
            .tag("provider", provider)
            .tag("success", String.valueOf(success))
            .register(meterRegistry)
            .record(Duration.ofMillis(latencyMs));
    }

    public void recordTokenUsage(String provider, int promptTokens, int completionTokens) {
        meterRegistry.counter("ai.tokens.prompt", "provider", provider)
            .increment(promptTokens);
        meterRegistry.counter("ai.tokens.completion", "provider", provider)
            .increment(completionTokens);
    }

    public void recordCacheHit(String type, boolean hit) {
        meterRegistry.counter("ai.cache", "type", type, "result", hit ? "hit" : "miss")
            .increment();
    }
}
```

#### 4.3.5 Add API Versioning

Update all controllers to use `/api/v1/` prefix:

```java
@RestController
@RequestMapping("/api/v1/ai")  // Changed from /api/ai
@RequiredArgsConstructor
@Slf4j
public class AIController {
    // ...
}
```

#### 4.3.6 Create Kafka Event Publisher

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishAIContentGenerated(String courseId, String contentType, Object content) {
        AIContentGeneratedEvent event = AIContentGeneratedEvent.builder()
            .courseId(courseId)
            .contentType(contentType)
            .content(content)
            .timestamp(Instant.now())
            .build();
        
        kafkaTemplate.send("lms.ai.content.generated", courseId, event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish AI event", ex);
                } else {
                    log.info("Published AI content event for course: {}", courseId);
                }
            });
    }
}
```

### 4.4 API Gateway Rate Limiting

Add to `lms-api-gateway/src/main/resources/application.yml`:

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: ai-service
          uri: lb://lms-ai-service
          predicates:
            - Path=/api/v1/ai/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20
                key-resolver: "#{@userKeyResolver}"
            - name: CircuitBreaker
              args:
                name: aiServiceCircuitBreaker
                fallbackUri: forward:/fallback/ai
```

---

## 5. AI SYSTEM IMPLEMENTATION PLAN

### 5.1 Components to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| `LLMProvider` | `infrastructure/llm/` | Interface for LLM providers |
| `GroqProvider` | `infrastructure/llm/` | Groq API implementation |
| `OpenAIProvider` | `infrastructure/llm/` | OpenAI fallback implementation |
| `AIGateway` | `infrastructure/llm/` | Multi-provider routing with failover |
| `PromptTemplate` | `domain/entity/` | JPA entity for versioned prompts |
| `PromptRegistryService` | `service/` | CRUD for prompt templates |
| `AIMetricsCollector` | `infrastructure/metrics/` | Prometheus metrics |
| `AIAuditLogger` | `infrastructure/` | Structured logging for AI decisions |

### 5.2 AI Gateway Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AIGateway                               │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  Provider   │    │  Circuit    │    │   Metrics       │  │
│  │  Registry   │───▶│  Breaker    │───▶│   Collector     │  │
│  │             │    │  Manager    │    │                 │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Groq      │    │   OpenAI    │    │  Anthropic  │     │
│  │  Provider   │    │  Provider   │    │  Provider   │     │
│  │  (Primary)  │    │ (Fallback1) │    │ (Fallback2) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 AIGateway Implementation

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class AIGateway {

    private final List<LLMProvider> providers;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final AIMetricsCollector metricsCollector;

    public String generate(String prompt, String systemPrompt, AIGenerationOptions options) {
        for (LLMProvider provider : getOrderedProviders()) {
            String providerName = provider.getName();
            CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker(providerName);
            
            try {
                return cb.executeSupplier(() -> {
                    long start = System.currentTimeMillis();
                    String result = provider.generate(prompt, systemPrompt, options);
                    metricsCollector.recordGeneration(
                        options.getType(), providerName, 
                        System.currentTimeMillis() - start, true);
                    return result;
                });
            } catch (Exception e) {
                log.warn("Provider {} failed, trying next", providerName, e);
                metricsCollector.recordGeneration(
                    options.getType(), providerName, 0, false);
            }
        }
        throw new AIServiceUnavailableException("All AI providers failed");
    }

    private List<LLMProvider> getOrderedProviders() {
        return providers.stream()
            .sorted(Comparator.comparingInt(LLMProvider::getPriority))
            .toList();
    }
}
```

### 5.4 Prompt Registry Implementation

```java
@Entity
@Table(name = "prompt_templates")
@Data
public class PromptTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false, unique = true)
    private String name;           // e.g., "course.generation.v2"
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String systemPrompt;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String userPromptTemplate;  // With {{placeholders}}
    
    @Version
    private Integer version;
    
    private boolean active = true;
    
    @Column(updatable = false)
    private Instant createdAt;
    
    private Instant updatedAt;
}
```

### 5.5 Data Flow

```
1. Request arrives at AIController
          │
          ▼
2. PromptRegistryService loads template by name
          │
          ▼
3. Template variables are interpolated
          │
          ▼
4. AIGateway.generate() called
          │
          ▼
5. Circuit Breaker checks provider health
          │
          ├── Provider healthy ──▶ Execute request
          │                              │
          │                              ▼
          │                       6. Provider responds
          │                              │
          │                              ▼
          │                       7. Metrics recorded
          │                              │
          │                              ▼
          │                       8. Kafka event published
          │                              │
          └── Provider failed ───▶ Try next provider
                                         │
                                         └── All failed ──▶ Return fallback/error
```

### 5.6 Execution Order

1. **Day 1-2:** Create `LLMProvider` interface and `GroqProvider` implementation
2. **Day 3:** Create `AIGateway` with basic routing (no failover yet)
3. **Day 4:** Add Resilience4j circuit breaker to `AIGateway`
4. **Day 5:** Create `AIMetricsCollector` and integrate with `AIGateway`
5. **Day 6:** Create `PromptTemplate` entity and `PromptRegistryService`
6. **Day 7:** Migrate existing hardcoded prompts to database
7. **Day 8:** Add Kafka event publishing for AI generation events
8. **Day 9:** Add `OpenAIProvider` as fallback
9. **Day 10:** Integration testing and metrics dashboard

---

## 6. EXECUTION ROADMAP

### Phase 1: Stabilization (Week 1-2)

**Goal:** Fix critical issues without structural changes

| Day | Task | Owner | Acceptance Criteria |
|-----|------|-------|---------------------|
| 1-2 | Install TanStack Query, create queryClient | Frontend | Package installed, App wrapped in QueryClientProvider |
| 1-2 | Add Resilience4j to AI service | Backend | Circuit breaker triggers on failure |
| 3 | Create ErrorBoundary component | Frontend | AI components wrapped, fallback UI shows |
| 3 | Fix StreamingGenerationService async | Backend | No `new Thread()`, uses @Async |
| 4-5 | Migrate 3 key queries to React Query | Frontend | Courses, Users, Assessments use useQuery |
| 4-5 | Add AI metrics (Micrometer) | Backend | Prometheus scrapes ai.* metrics |
| 6-7 | Remove raw fetch() from AI components | Frontend | All HTTP through apiClient |
| 6-7 | Add API versioning /api/v1/ | Backend | All endpoints have v1 prefix |
| 8-9 | Add Kafka to AI service | Backend | Events published on generation |
| 10 | Integration testing | All | E2E flow works with new components |

**Deliverables:**
- [ ] TanStack Query integrated
- [ ] Circuit breakers on AI calls
- [ ] Error boundaries on AI components
- [ ] Fixed async execution
- [ ] AI metrics in Prometheus

### Phase 2: Structural Refactor (Week 3-4)

**Goal:** Implement proper architecture patterns

| Day | Task | Owner | Acceptance Criteria |
|-----|------|-------|---------------------|
| 1-2 | Create AIGateway abstraction | Backend | Single entry point for all LLM calls |
| 1-2 | Migrate remaining queries to React Query | Frontend | No data in Zustand stores |
| 3-4 | Create PromptRegistry | Backend | Prompts in database, loaded dynamically |
| 3-4 | Create useAIStreaming hook | Frontend | SSE with auto-reconnect |
| 5-6 | Add OpenAI fallback provider | Backend | Automatic failover when Groq fails |
| 5-6 | Create mutations with optimistic updates | Frontend | Grade submission is instant |
| 7-8 | Gateway rate limiting | Backend | /api/v1/ai/** rate limited |
| 9-10 | Kafka consumers in analytics service | Backend | Events consumed and stored |

**Deliverables:**
- [ ] AIGateway with multi-provider support
- [ ] All data fetching via React Query
- [ ] Prompt templates in database
- [ ] Rate limiting on AI endpoints
- [ ] Event-driven analytics

### Phase 3: AI Hardening (Week 5-6)

**Goal:** Production-grade AI infrastructure

| Day | Task | Owner | Acceptance Criteria |
|-----|------|-------|---------------------|
| 1-2 | AI audit logging | Backend | All prompts/responses logged |
| 1-2 | AI-specific error handling | Frontend | Graceful degradation UI |
| 3-4 | Semantic caching (Redis) | Backend | Repeated prompts hit cache |
| 3-4 | AI loading states | Frontend | Progress indicators, cancellation |
| 5-6 | Cost tracking per user | Backend | Token usage per user tracked |
| 5-6 | AI dashboard (Grafana) | DevOps | AI metrics visualized |
| 7-8 | Prompt A/B testing | Backend | Can run multiple prompt versions |
| 9-10 | Load testing | QA | 100 concurrent AI requests stable |

**Deliverables:**
- [ ] Complete AI observability
- [ ] Semantic caching
- [ ] Cost tracking
- [ ] Performance validated

### Phase 4: Scaling Readiness (Week 7-8)

**Goal:** Prepare for production scale

| Day | Task | Owner | Acceptance Criteria |
|-----|------|-------|---------------------|
| 1-3 | Database per service evaluation | Backend | Migration plan documented |
| 1-3 | CDN for static assets | DevOps | Frontend served from CDN |
| 4-5 | Horizontal scaling config | DevOps | Services can scale to 3 replicas |
| 4-5 | React performance audit | Frontend | Lighthouse score > 90 |
| 6-7 | Chaos engineering tests | QA | System survives component failures |
| 8-10 | Documentation and runbooks | All | Ops documentation complete |

**Deliverables:**
- [ ] Scaling strategy validated
- [ ] Performance optimized
- [ ] Chaos tests passed
- [ ] Documentation complete

---

## 7. DEFINITION OF DONE

### 7.1 Phase 1 Completion Criteria

- [ ] `@tanstack/react-query` is in package.json
- [ ] `QueryClientProvider` wraps the App
- [ ] At least 3 data-fetching components use `useQuery`
- [ ] `ErrorBoundary` exists and wraps AI components
- [ ] No `new Thread()` in any service class
- [ ] `@Async` with named executor used for async operations
- [ ] `resilience4j-spring-boot3` dependency added
- [ ] Circuit breaker annotation on `LlamaApiService.generate()`
- [ ] Prometheus scrapes AI metrics at `/actuator/prometheus`
- [ ] All endpoints have `/api/v1/` prefix

### 7.2 Phase 2 Completion Criteria

- [ ] `AIGateway` class exists with `generate()` method
- [ ] At least 2 `LLMProvider` implementations (Groq, OpenAI)
- [ ] `PromptTemplate` entity with JPA repository
- [ ] No raw `fetch()` calls in frontend (all through apiClient)
- [ ] Zustand stores only contain client state (no server data)
- [ ] Kafka topic `lms.ai.content.generated` receives events
- [ ] API Gateway has `RequestRateLimiter` filter on AI routes

### 7.3 Phase 3 Completion Criteria

- [ ] All AI requests logged with prompt hash and latency
- [ ] Redis caches AI responses (TTL configurable)
- [ ] Token usage tracked per user in database
- [ ] Grafana dashboard shows AI metrics
- [ ] `useAIStreaming` hook handles reconnection
- [ ] AI error fallback UI implemented

### 7.4 Full Production Readiness Criteria

- [ ] System handles 100+ concurrent AI requests
- [ ] Circuit breaker prevents cascade failures
- [ ] All AI providers have health checks
- [ ] Zero `console.log` in production frontend
- [ ] All environment variables documented
- [ ] Runbooks for common failure scenarios
- [ ] Load test results meet SLA

---

## APPENDIX A: Files to Create

### Frontend
1. `src/api/queryClient.ts`
2. `src/components/common/ErrorBoundary.tsx`
3. `src/components/ai/AIErrorFallback.tsx`
4. `src/hooks/useAIGeneration.ts`
5. `src/hooks/useAIStreaming.ts`
6. `src/queries/useCourseQueries.ts`
7. `src/queries/useAIQueries.ts`
8. `src/mutations/useAIMutations.ts`

### Backend
1. `lms-ai-service/.../config/AsyncConfig.java`
2. `lms-ai-service/.../config/Resilience4jConfig.java`
3. `lms-ai-service/.../config/KafkaConfig.java`
4. `lms-ai-service/.../infrastructure/llm/LLMProvider.java`
5. `lms-ai-service/.../infrastructure/llm/GroqProvider.java`
6. `lms-ai-service/.../infrastructure/llm/OpenAIProvider.java`
7. `lms-ai-service/.../infrastructure/llm/AIGateway.java`
8. `lms-ai-service/.../infrastructure/metrics/AIMetricsCollector.java`
9. `lms-ai-service/.../infrastructure/messaging/KafkaEventPublisher.java`
10. `lms-ai-service/.../domain/entity/PromptTemplate.java`
11. `lms-ai-service/.../domain/entity/AIGenerationLog.java`
12. `lms-ai-service/.../domain/event/AIContentGeneratedEvent.java`
13. `lms-ai-service/.../repository/PromptTemplateRepository.java`
14. `lms-ai-service/.../service/PromptRegistryService.java`
15. `lms-ai-service/.../exception/AIServiceUnavailableException.java`

### Configuration
1. `lms-ai-service/src/main/resources/application-resilience4j.yml`
2. `lms-api-gateway/src/main/resources/application-ratelimit.yml`

---

## APPENDIX B: Breaking Changes

| Change | Impact | Migration |
|--------|--------|-----------|
| `/api/*` → `/api/v1/*` | All frontend API calls | Update apiClient baseURL, coordinate deployment |
| Zustand data removal | Components using courseStore | Migrate to useQuery before removal |
| AI endpoint response format | AI streaming clients | Add version negotiation or coordinate release |

---

**Document Status:** AUTHORITATIVE  
**Next Review:** After Phase 1 completion  
**Escalation:** Any blockers to Principal Architect immediately

