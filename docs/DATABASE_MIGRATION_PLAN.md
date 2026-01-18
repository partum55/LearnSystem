# Database Per Service Migration Plan

**Document Status:** PLANNING  
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
│  courses         │  Course Service (owner)                  │
│  modules         │  Course Service (owner)                  │
│  enrollments     │  Course Service (owner)                  │
│  assignments     │  Assessment Service (owner)              │
│  quizzes         │  Assessment Service (owner)              │
│  submissions     │  Assessment Service (owner)              │
│  grades          │  Gradebook Service (owner)               │
│  deadlines       │  Deadline Service (owner)                │
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
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ lms_users_db │  │lms_courses_db│  │lms_assess_db │
│              │  │              │  │              │
│ users        │  │ courses      │  │ assignments  │
│ user_profiles│  │ modules      │  │ quizzes      │
│ auth_tokens  │  │ enrollments  │  │ submissions  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ User Service │  │Course Service│  │Assessment Svc│
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│lms_grades_db │  │lms_deadline_db│ │  lms_ai_db   │
│              │  │              │  │              │
│ grades       │  │ deadlines    │  │ prompt_*     │
│ grade_history│  │ reminders    │  │ ai_*         │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Gradebook Svc │  │ Deadline Svc │  │  AI Service  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 2.2 Database Ownership Matrix

| Service | Database | Tables | Data Volume Est. |
|---------|----------|--------|------------------|
| User Service | lms_users_db | users, user_profiles, auth_tokens | Low |
| Course Service | lms_courses_db | courses, modules, enrollments, lessons | Medium |
| Assessment Service | lms_assess_db | assignments, quizzes, submissions, quiz_attempts | High |
| Gradebook Service | lms_grades_db | grades, grade_history | Medium |
| Deadline Service | lms_deadline_db | deadlines, reminders, notifications | Low |
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

**Phase C: Deadline Service (Low Risk)**
- Minimal coupling
- Uses Kafka for course events
- Timeline: Week 2

**Phase D: Gradebook Service (Medium Risk)**
- Depends on user_id, course_id (can be stored as values)
- Timeline: Week 3

**Phase E: Assessment Service (Medium Risk)**
- Depends on course_id, user_id
- Large data volume
- Timeline: Week 4

**Phase F: Course Service (High Risk)**
- Central entity with many references
- Requires careful data synchronization
- Timeline: Week 5-6

**Phase G: User Service (High Risk)**
- Most referenced entity
- Final migration
- Timeline: Week 7-8

### 3.2 Data Synchronization Strategy

For cross-service references, use eventual consistency:

```
┌─────────────────┐    Kafka Events    ┌─────────────────┐
│  Course Service │ ───────────────────▶ │ Assessment Svc  │
│                 │  course.created     │                 │
│                 │  course.updated     │ Local cache:    │
│                 │  course.deleted     │ courses (id,    │
│                 │                     │  title, status) │
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
| 2 | Migrate Deadline Service | lms-deadline-service |
| 3 | Migrate Gradebook Service | lms-gradebook-service |
| 4 | Migrate Assessment Service | lms-assessment-service |
| 5-6 | Migrate Course Service | lms-course-service |
| 7-8 | Migrate User Service | lms-user-service |

---

**Document Status:** APPROVED FOR IMPLEMENTATION  
**Next Steps:** Begin Phase A (AI Service migration) after production stabilization

