# Database Per Service Migration Plan

**Document Status:** UPDATED (Post-Learning Consolidation)  
**Created:** December 19, 2025  
**Owner:** Principal Architect

---

## 1. Current State Analysis

### 1.1 Shared Database Architecture

Currently, all services share a single PostgreSQL database (`lms_db`):

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL (lms_db)                       │
├─────────────────────────────────────────────────────────────┤
│  users           │  User Service (owner)                    │
│  user_profiles   │  User Service (owner)                    │
│  courses         │  Learning Service (course domain owner)  │
│  modules         │  Learning Service (course domain owner)  │
│  enrollments     │  Learning Service (course domain owner)  │
│  assignments     │  Learning Service (assessment owner)     │
│  quizzes         │  Learning Service (assessment owner)     │
│  submissions     │  Learning Service (submission owner)     │
│  grades          │  Learning Service (gradebook owner)      │
│  deadlines       │  Learning Service (deadline owner)       │
│  prompt_templates│  AI Service (owner)                      │
│  ai_generation_log│ AI Service (owner)                      │
│  ai_user_usage   │  AI Service (owner)                      │
│  ai_prompt_ab_test│ AI Service (owner)                      │
│  course_templates│  AI Service (owner)                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Problems with Shared Database

| Problem | Impact | Severity |
|---------|--------|----------|
| Schema coupling | Changes in one service can break others | High |
| Single point of failure | DB outage affects all services | Critical |
| Scaling limitations | Cannot scale databases independently | Medium |
| Migration complexity | Coordinated deployments required | Medium |
| Performance bottleneck | All queries compete for resources | Medium |

---

## 2. Target State: Database Per Service

### 2.1 Target Architecture

```
┌──────────────┐  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐
│ lms_users_db │  │lms_learning_db │  │  lms_ai_db   │  │ lms_analytics_db │
│              │  │                │  │              │  │                  │
│ users        │  │ courses        │  │ prompt_*     │  │ events           │
│ user_profiles│  │ modules        │  │ ai_*         │  │ aggregations     │
│ auth_tokens  │  │ enrollments    │  │ course_*     │  │ predictions      │
│              │  │ assignments    │  │              │  │                  │
│              │  │ quizzes        │  │              │  │                  │
│              │  │ submissions    │  │              │  │                  │
│              │  │ grades         │  │              │  │                  │
│              │  │ deadlines      │  │              │  │                  │
└──────┬───────┘  └───────┬────────┘  └──────┬───────┘  └────────┬─────────┘
       │                  │                  │                    │
       ▼                  ▼                  ▼                    ▼
┌──────────────┐  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐
│ User Service │  │Learning Service│  │  AI Service  │  │ Analytics Service│
└──────────────┘  └────────────────┘  └──────────────┘  └──────────────────┘
```

### 2.2 Database Ownership Matrix

| Service | Database | Tables | Data Volume Est. |
|---------|----------|--------|------------------|
| User Service | lms_users_db | users, user_profiles, auth_tokens | Low |
| Learning Service | lms_learning_db | courses, modules, enrollments, assignments, quizzes, submissions, gradebook, deadlines | High |
| AI Service | lms_ai_db | prompt_templates, ai_generation_log, ai_user_usage, ai_prompt_ab_test, course_templates | Medium |
| Analytics Service | lms_analytics_db | events, aggregations, predictions | Very High |

---

## 3. Migration Strategy

### 3.1 Phased Approach

**Phase A: AI Service (Low Risk)**
- AI tables have no foreign keys to other services
- Can be migrated independently
- Timeline: Week 1

**Phase B: Analytics Service (Low Risk)**
- Read-only, event-driven
- No dependencies on other tables
- Timeline: Week 1-2

**Phase C: Learning Service (High Risk)**
- Consolidated runtime includes course + assessment + submission + gradebook + deadline domains
- Highest data volume and most domain relationships
- Requires careful data synchronization
- Timeline: Week 3-5

**Phase D: User Service (High Risk)**
- Most referenced entity
- Final migration
- Timeline: Week 6-7

### 3.2 Data Synchronization Strategy

For cross-service references, use eventual consistency:

```
┌─────────────────┐    Kafka Events    ┌─────────────────┐
│Learning Service │ ───────────────────▶ │Analytics Service│
│                 │  course.updated     │                 │
│                 │  assignment.graded  │ Local cache:    │
│                 │  submission.created │ course/grade KPIs│
│                 │                     │ and predictions │
└─────────────────┘                     └─────────────────┘
```

### 3.3 Migration Script Template

```sql
-- Step 1: Create new database
CREATE DATABASE lms_ai_db;

-- Step 2: Create tables in new database
-- (Apply all Flyway migrations)

-- Step 3: Copy data
INSERT INTO lms_ai_db.prompt_templates 
SELECT * FROM lms_db.prompt_templates;

-- Step 4: Verify counts
SELECT 
    (SELECT COUNT(*) FROM lms_db.prompt_templates) as old_count,
    (SELECT COUNT(*) FROM lms_ai_db.prompt_templates) as new_count;

-- Step 5: Update service config to point to new DB
-- (Deployment step)

-- Step 6: Verify service is using new DB
-- (Monitoring step)

-- Step 7: Drop tables from old database (after validation period)
-- DROP TABLE lms_db.prompt_templates;
```

---

## 4. Cross-Service Data Access Patterns

### 4.1 Replace JOINs with API Calls

**Before (direct JOIN):**
```sql
SELECT s.*, u.name, c.title
FROM submissions s
JOIN users u ON s.user_id = u.id
JOIN courses c ON s.course_id = c.id;
```

**After (Feign client + local cache):**
```java
@FeignClient(name = "lms-user-service")
public interface UserClient {
    @GetMapping("/api/v1/users/{id}")
    UserDTO getUser(@PathVariable String id);
}

// Use with caching
@Cacheable("users")
public UserDTO getUser(String userId) {
    return userClient.getUser(userId);
}
```

### 4.2 Event-Driven Synchronization

For frequently accessed data, maintain local read replicas:

```java
@KafkaListener(topics = "lms.user.updated")
public void onUserUpdated(UserUpdatedEvent event) {
    userLocalCache.update(event.getUserId(), event.getName(), event.getEmail());
}
```

---

## 5. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Data inconsistency during migration | Use CDC (Change Data Capture) during transition |
| Increased latency for cross-service queries | Implement caching and read replicas |
| Complex distributed transactions | Use Saga pattern with compensating actions |
| Increased infrastructure cost | Consolidate small DBs, use managed services |

---

## 6. Prerequisites

1. ✅ Kafka configured for event publishing
2. ✅ Feign clients available for cross-service calls
3. ⬜ CDC tool selected (Debezium recommended)
4. ⬜ Monitoring for database health metrics
5. ⬜ Backup and restore procedures tested

---

## 7. Rollback Plan

If issues arise:
1. Switch service config back to shared database
2. Sync any new data from isolated DB to shared DB
3. Drop isolated database after sync verification

---

## 8. Timeline Summary

| Week | Action | Services |
|------|--------|----------|
| 1 | Migrate AI Service | lms-ai-service |
| 1-2 | Migrate Analytics Service | lms-analytics-service |
| 3-5 | Migrate Learning Service domains (course+assessment+submission+gradebook+deadline) | lms-learning-service |
| 6-7 | Migrate User Service | lms-user-service |

---

**Document Status:** APPROVED (Revised for consolidated architecture)  
**Next Steps:** Execute migration in service-order above, with Learning Service treated as one bounded context.
