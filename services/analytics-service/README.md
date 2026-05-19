# LMS Analytics Service

Analytics microservice for reporting and student/course insights.

## Responsibilities
- Aggregate course-level statistics.
- Provide student progress summaries for courses.
- Integrate with AI predictions and other platform services for analytics views.

## Runtime
- Default port: `8088`
- Service name: `lms-analytics-service`
- Base context path: `/api`

## Main API Endpoints
- `GET /api/analytics/courses/{courseId}/stats`
- `GET /api/analytics/courses/{courseId}/student-progress`

## Dependencies
- PostgreSQL
- Redis
- Eureka (service discovery)
- Downstream service calls to user/learning/AI domains as required by analytics workflows

## Run Locally

```bash
cd backend-spring
mvn -pl lms-analytics-service -am spring-boot:run
```
