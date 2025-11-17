# Smart Deadlines & Intelligent Calendar Service

Production-grade deadline management and calendar module for the LMS platform.

## Features

### 1. Deadline Management
- **Automatic Ingestion**: Pulls deadlines from course/assessment services via Feign clients
- **Manual Creation**: REST API for creating custom deadlines
- **Default Effort Estimation**:
  - QUIZ: 30 minutes
  - ASSIGNMENT: 120 minutes  
  - EXAM: 240 minutes
- **Real-time Webhook**: Immediate ingestion on assignment creation

### 2. Workload Engine
- **Automated Calculation**: Aggregates estimated effort per student per day
- **Snapshot Persistence**: Caches workload summaries for fast retrieval
- **Hourly Recomputation**: Scheduled job keeps workload data fresh

### 3. Conflict Detection
- **Overload Detection**: Flags days exceeding 4 hours (240 minutes) of work
- **Major Deadline Overflow**: Alerts when >3 major assignments/exams due same day
- **Simultaneous Deadlines**: Detects multiple deadlines with identical timestamps

### 4. Calendar API
- **Month View**: Returns day-by-day breakdown with workload and deadlines
- **Conflict Reporting**: Lists detected scheduling conflicts
- **ICS Export**: Generate `.ics` calendar file for external calendar apps

### 5. Notification Service
- **Multi-Channel Delivery**: Email + WebSocket push notifications
- **Adaptive Scheduling**: 48h, 24h, 6h before deadline reminders
- **Smart Frequency**: Adjusts based on student completion patterns (placeholder for future ML integration)

## Architecture

```
lms-deadline-service/
├── calendar/          # Calendar views, ICS export
├── common/            # Shared configs, exception handling
├── conflict/          # Conflict detection engine
├── deadline/          # Core deadline domain (entities, DTOs, controllers, services)
├── feign/             # Feign clients (Course, Assessment, Submission services)
├── ingestion/         # Deadline import workflows (cron + webhook)
├── notification/      # Email, WebSocket, adaptive scheduler
├── scheduler/         # Background jobs (ingestion, workload, notifications)
├── security/          # JWT filter, extends lms-common security
└── workload/          # Workload aggregation and snapshot management
```

## API Endpoints

### Deadlines
- `GET /api/deadlines/group/{studentGroupId}?from=&to=` - List deadlines for group
- `GET /api/deadlines/{id}` - Get deadline details
- `POST /api/deadlines` - Create deadline (teachers/admins only)

### Calendar
- `GET /api/calendar/student/{studentGroupId}/month?year=YYYY&month=MM` - Month view
- `GET /api/calendar/student/{studentGroupId}/conflicts` - Conflict list
- `GET /api/calendar/student/{studentGroupId}/ics` - Download ICS calendar

### Ingestion
- `POST /api/ingestion/webhook/course/{courseId}` - Trigger immediate ingestion

## Configuration

### Database
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/lms_deadlines
    username: lms
    password: lms
```

### Schedulers
```yaml
deadline:
  ingestion:
    cron: "0 */10 * * * *"  # Every 10 minutes
workload:
  snapshot:
    cron: "0 0 * * * *"     # Every hour
notification:
  dispatch:
    cron: "0 */15 * * * *"  # Every 15 minutes
  thresholds:
    overload-minutes: 240   # 4 hours
```

### Feign Clients
```yaml
services:
  course:
    base-url: http://localhost:8081
  assessment:
    base-url: http://localhost:8082
  submission:
    base-url: http://localhost:8083
```

### Email (JavaMailSender)
```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

### WebSocket
Endpoint: `/ws/deadlines`  
Topic: `/topic/deadlines/{studentGroupId}`

## Security

- **Shared Filters**: Reuses `lms-common` JWT, rate limiting, security headers
- **Role-Based Access**:
  - Students: Read-only for their own deadlines
  - Teachers/Admins: Full CRUD, ingestion triggers, recalculation
- **RBAC Annotations**: `@PreAuthorize` on sensitive endpoints

## Testing

```bash
# Unit + Integration tests
mvn test -pl lms-deadline-service

# Integration tests only
mvn verify -pl lms-deadline-service
```

## Deployment

```bash
# Build
mvn clean package -pl lms-deadline-service -am

# Run
java -jar lms-deadline-service/target/lms-deadline-service-1.0.0-SNAPSHOT.jar
```

## Migration Status

- ✅ Core domain (Deadline, WorkloadSnapshot entities)
- ✅ DTOs, mappers, repositories
- ✅ Ingestion service + scheduler + webhook
- ✅ Workload engine + scheduler
- ✅ Conflict detection
- ✅ Calendar API + ICS export
- ✅ Notification service + scheduler (email + WebSocket)
- ✅ Security configuration (JWT, RBAC)
- ✅ Feign clients (Course, Assessment, Submission)
- ✅ Global exception handling
- ⏳ Unit/integration tests (pending)
- ⏳ Adaptive notification logic (ML-based, future enhancement)

## Future Enhancements

1. **Adaptive Notifications**: ML model to predict student behavior and adjust reminder frequency
2. **Student Groups**: Full integration with course membership for accurate group targeting
3. **Notification History**: Persist sent notifications to avoid duplicates
4. **Dashboard Analytics**: Aggregate workload trends, conflict patterns
5. **Google Calendar Sync**: Two-way sync with external calendars

