## **PROMPT: Smart Deadlines Calendar Module — Full Development Plan**

You are an expert senior software architect.
Your task:
**Generate the full implementation architecture, folder structure, classes, services, entities, repositories, controllers, configs, SQL migrations, and all necessary logic**
for the "Smart Deadlines & Intelligent Calendar Module" described below.

Follow ALL requirements.

---

# 1. **System Summary**

Build a fully functional backend module for an LMS using **Spring Boot 3**, PostgreSQL, and JPA.
The module manages deadlines, workload, conflicts, notifications, and calendar export.

The module should be clean, scalable, microservice-ready, and written with production-grade quality.

---

# 2. **Technical Stack**

* Java 21
* Spring Boot 3.x
* Spring Web MVC
* Spring Data JPA (Hibernate)
* PostgreSQL 15
* Flyway for migrations
* Spring Scheduler (@Scheduled)
* WebSocket/STOMP for push notifications
* JavaMailSender for emails
* iCal4J for ICS export
* Lombok
* MapStruct (optional, recommended)

---

# 3. **Modules to Implement**

Implement 6 logical modules:

1. **Deadline Ingestion**
2. **Deadline Storage**
3. **Workload Engine**
4. **Conflict Detection Engine**
5. **Calendar API**
6. **Notification Service**

Each module must have:

* entities
* service classes
* repository interfaces
* DTOs
* mappers (MapStruct if chosen)
* REST controllers
* unit tests (if requested)

---

# 4. **Data Models (Entities)**

## Deadline

```
id: Long
courseId: Long
studentGroupId: Long
title: String
description: String
dueAt: LocalDateTime
estimatedEffort: Integer
type: String  // ASSIGNMENT, QUIZ, EXAM
createdAt: LocalDateTime
```

## WorkloadSnapshot

```
id: Long
studentId: Long
date: LocalDate
totalEffort: Integer
generatedAt: LocalDateTime
```

---

# 5. **Functional Requirements**

### 5.1 Deadline Ingestion

* Cron job every X minutes scans the course database and imports deadlines.
* Optional webhook for real-time updates.
* Default estimatedEffort rules:

    * QUIZ → 30 min
    * ASSIGNMENT → 120 min
    * EXAM → 240 min
* Validation of imported data.

### 5.2 Workload Engine

* Compute total workload per student per day.
* Store cached snapshots.
* Recompute once per hour.

### 5.3 Conflict Detection Engine

Rules:

* Overloaded day: workload > 4 hours (default).
* More than 3 major deadlines in one day.
* Multiple deadlines with the same timestamp.

### 5.4 Calendar API

Endpoints:

#### GET /api/calendar/student/{id}/month

Returns array of:

```
{
  date: "yyyy-MM-dd",
  workloadMinutes: number,
  isOverloaded: boolean,
  deadlines: [...]
}
```

#### GET /api/calendar/student/{id}/conflicts

Returns detected conflicts.

#### GET /api/calendar/student/{id}/ics

Generates ICS calendar file.

### 5.5 Notification Service

Triggers:

* 48h before deadline
* 24h before
* 6h before

Adaptive:

* If student misses deadlines → increase frequency
* If student delivers early → reduce frequency

Delivery channels:

* Email
* WebSocket push

---

# 6. **Non-Functional Requirements**

* Clean architecture
* High cohesion, low coupling
* Controllers → Services → Repositories
* DTOs for API
* Global exception handler
* Validation using @Valid
* Response times <150ms
* Secure endpoints (RBAC placeholders)

---

# 7. **Expected Output from the LLM**

The LLM should generate:

## 7.1 PROJECT STRUCTURE

```
src/main/java/...
    /deadline
        /controller
        /service
        /repository
        /entity
        /dto
        /mapper
        /config
    /workload
    /conflict
    /calendar
    /notification
    /common
```

## 7.2 ENTITIES & SCHEMAS

* Java classes for Deadline, WorkloadSnapshot
* Flyway migrations (V1__create_deadline.sql, etc.)

## 7.3 REPOSITORIES

* DeadlineRepository
* WorkloadSnapshotRepository

## 7.4 SERVICES

* DeadlineIngestionService
* WorkloadEngine
* ConflictDetectionService
* CalendarService
* NotificationService

## 7.5 CONTROLLERS

* DeadlineController
* CalendarController
* NotificationController

## 7.6 DTOs

* DeadlineDto
* CalendarDayDto
* ConflictDto

## 7.7 MAPPERS

* MapStruct interfaces
* Or manual mapper classes

## 7.8 SCHEDULED TASKS

* deadline ingestion
* workload snapshot generation
* notification dispatcher

## 7.9 ICS GENERATION

* Class using ical4j to produce .ics file

## 7.10 SAMPLE TESTS

* service layer unit tests

---

# 8. **Rules for Generation**

1. Write production-grade, idiomatic Java code.
2. Include comments and Javadoc explaining architecture decisions.
3. Do NOT add features not listed in this PRD.
4. Follow good clean-architecture practices.
5. If something is ambiguous — choose the simplest solution.
6. All timestamps must use UTC.
7. Output everything in a single answer unless too long — then split into multiple sequential answers.

---

# 9. **Deliverables**

The output of your generation must include:

* Full backend architecture
* Full code for entities
* Full repository interfaces
* Full service layer
* Full controllers
* Full DTOs
* Full schedulers
* Full ICS exporter
* Full conflict detection logic
* Full workload calculator
* Full Flyway migrations
* Full folder structure

