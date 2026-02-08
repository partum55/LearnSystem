# LMS Learning Service

Combined learning-domain service for the Learning Management System.

## 📋 Features

### Course Management
- ✅ Create, update, and delete courses
- ✅ Multilingual support (Ukrainian/English)
- ✅ Course visibility controls (Public, Private, Draft)
- ✅ Course status management (Draft, Published, Archived)
- ✅ Enrollment capacity management
- ✅ Academic year and department tracking
- ✅ Course search and filtering

### Enrollment Management
- ✅ User enrollment with role assignment (TEACHER, TA, STUDENT)
- ✅ Enrollment status tracking (active, dropped, completed)
- ✅ Capacity checking before enrollment
- ✅ Permission-based enrollment management
- ✅ Self-enrollment for students
- ✅ Drop enrollment functionality

### Content Organization
- ✅ Module-based content structure
- ✅ Resource management (files, videos, links, text, code)
- ✅ Position-based ordering
- ✅ Publish date scheduling
- ✅ Flexible metadata storage (JSONB)

## 🏗️ Architecture

### Domain Model
```
Learning Domain
├── Courses
│   ├── CourseMember (enrollment)
│   └── Module -> Resource
├── Assessments
│   └── Assignment, Quiz, QuestionBank, Attempts
├── Gradebook
│   └── Entries, Categories, Summaries
├── Submissions
│   └── Draft/Submit/Grade workflows
└── Deadlines
    └── Calendar, Notifications, Workload snapshots
```

### Technology Stack
- Spring Boot 3.2.2
- Spring Data JPA with PostgreSQL
- Spring Security
- Redis for caching
- Flyway for database migrations
- Lombok for boilerplate reduction

## 📊 Database Schema

### Tables
- `courses` - Main course data with multilingual support
- `course_members` - User enrollment and membership
- `modules` - Course content modules
- `resources` - Learning resources (files, links, etc.)

All tables use UUID primary keys for better distributed system support.

## 🚀 API Endpoints

### Course Endpoints
```
GET    /api/courses                    - List all courses (paginated)
GET    /api/courses/published          - List published courses
GET    /api/courses/search?q=          - Search courses
GET    /api/courses/my                 - Get user's enrolled courses
GET    /api/courses/{id}               - Get course by ID
GET    /api/courses/code/{code}        - Get course by code
POST   /api/courses                    - Create new course
PUT    /api/courses/{id}               - Update course
DELETE /api/courses/{id}               - Delete course
POST   /api/courses/{id}/publish       - Publish course
POST   /api/courses/{id}/unpublish     - Unpublish course
```

### Enrollment Endpoints
```
POST   /api/courses/{id}/enroll        - Enroll user in course
DELETE /api/courses/{id}/enroll/{uid}  - Unenroll user
POST   /api/courses/{id}/drop          - Drop enrollment (self)
GET    /api/courses/{id}/members       - List course members
GET    /api/courses/{id}/enrollment    - Get user's enrollment
GET    /api/courses/{id}/enrollment/check - Check if enrolled
```

## 🔒 Security

### Authentication
- JWT-based authentication (to be integrated)
- OAuth 2.1 Resource Server support

### Authorization
- Course owners can manage their courses
- Teachers and TAs can manage course content
- Students have read-only access to enrolled courses
- Public courses visible without authentication

### CORS
- Configured for development (localhost:3000, localhost:5173)
- Production domains configurable via environment

## 🗄️ Caching Strategy

- Course details cached with Redis
- Cache invalidation on updates
- TTL: 1 hour for course data

## 📝 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=jdbc:postgresql://localhost:5432/lms_dev
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_ISSUER_URI=http://localhost:8080
JWT_JWK_SET_URI=http://localhost:8080/.well-known/jwks.json

# Server
PORT=8081
LOG_LEVEL=INFO
```

## 🧪 Running the Service

### Prerequisites
- Java 21
- PostgreSQL 15+
- Redis 7+
- Maven 3.9+

### Start the Service
```bash
# Using Maven
mvn spring-boot:run

# Using JAR
mvn clean package
java -jar target/lms-learning-service-1.0.0-SNAPSHOT.jar
```

### Run with Docker
```bash
docker-compose up lms-learning-service
```

## 📦 API Response Format

### Success Response
```json
{
  "id": "uuid",
  "code": "CS101",
  "titleUk": "Вступ до програмування",
  "titleEn": "Introduction to Programming",
  "ownerId": "uuid",
  "status": "PUBLISHED",
  "isPublished": true,
  "currentEnrollment": 45,
  "maxStudents": 100,
  "hasCapacity": true
}
```

### Error Response
```json
{
  "timestamp": "2025-11-13T10:30:00",
  "status": 404,
  "error": "Not Found",
  "message": "Course not found with id: uuid",
  "path": "/api/courses/uuid"
}
```

### Paginated Response
```json
{
  "content": [...],
  "pageNumber": 0,
  "pageSize": 20,
  "totalElements": 150,
  "totalPages": 8,
  "first": true,
  "last": false
}
```

## 🔄 Migration from Django

This service migrates the following Django models:
- `courses.Course` → `Course` entity
- `courses.CourseMember` → `CourseMember` entity
- `courses.Module` → `Module` entity
- `courses.Resource` → `Resource` entity

### Key Differences
- UUID primary keys instead of auto-increment
- JSONB metadata instead of Django JSONField
- Native PostgreSQL features (indexes, constraints)
- Redis caching instead of Django cache framework
- Spring Security instead of Django authentication

## 📈 Performance Considerations

- Database connection pooling with HikariCP
- Query optimization with proper indexes
- Redis caching for frequently accessed data
- Batch processing for bulk operations
- Efficient pagination with Spring Data

## 🧪 Testing

```bash
# Run unit tests
mvn test

# Run integration tests
mvn verify

# Run specific test
mvn test -Dtest=CourseServiceTest
```

## 📚 Next Steps

1. ✅ ~~Implement Module and Resource management endpoints~~ **COMPLETED**
2. ⏳ Add file upload support for course thumbnails and resources
3. ⏳ Integrate with User Service for user enrichment
4. ⏳ Add course analytics endpoints
5. ⏳ Implement course cloning functionality
6. ⏳ Add bulk enrollment features
7. ⏳ Implement course prerequisites
8. ⏳ Add course categories/tags
9. ⏳ Add comprehensive unit tests
10. ⏳ Add integration tests

## 🤝 Related Services

- **lms-user-service** - User authentication and management
- **lms-learning-service** - Courses, assessments, gradebook, submissions, and deadlines
- **lms-ai-service** - AI-powered course and assessment generation
- **lms-analytics-service** - Cross-domain analytics and reporting

## 📄 License

Copyright © 2025 University Learning Management System
