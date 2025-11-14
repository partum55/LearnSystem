# LMS Assessment Service

Assessment and quiz management microservice for the Learning Management System.

## 📋 Features

### Assignment Management
- ✅ 7 assignment types (QUIZ, FILE_UPLOAD, TEXT, CODE, URL, MANUAL_GRADE, EXTERNAL)
- ✅ Rich content support (PLAIN, MARKDOWN, HTML, RICH text with LaTeX)
- ✅ Code submissions with auto-grading support
- ✅ Rubric-based grading
- ✅ Late submission handling with penalties
- ✅ Peer review system
- ✅ Template and archiving
- ✅ Prerequisites tracking
- ✅ File upload constraints (type, size, count)
- ✅ Assignment duplication

### Quiz System
- ✅ Comprehensive quiz management
- ✅ 13 question types support
- ✅ Time limits and multiple attempts
- ✅ Question and answer shuffling
- ✅ Show/hide correct answers with scheduling
- ✅ Pass percentage configuration
- ✅ Reusable question bank

### Question Types (13 types)
1. MULTIPLE_CHOICE - Multiple choice questions
2. TRUE_FALSE - True/False questions
3. FILL_BLANK - Fill in the blank
4. MATCHING - Matching questions
5. NUMERICAL - Numerical answers
6. FORMULA - Formula-based questions
7. SHORT_ANSWER - Short text answers
8. ESSAY - Long-form essays
9. CODE - Code submission questions
10. FILE_UPLOAD - File upload questions
11. ORDERING - Ordering/sequencing
12. HOTSPOT - Image hotspot selection
13. DRAG_DROP - Drag and drop

### Quiz Attempt Tracking
- ✅ Multiple attempts per student
- ✅ Answer storage (JSONB)
- ✅ Auto and manual grading
- ✅ Grading workflow
- ✅ Feedback system
- ✅ Proctoring data capture
- ✅ Security tracking (IP, browser fingerprint)

## 🏗️ Architecture

### Domain Model
```
Assignment (7 types)
Quiz
├── QuizQuestion (association)
│   └── QuestionBank (13 types, reusable)
└── QuizAttempt (student attempts)
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
- `assignments` - Main assignment data with all types
- `quizzes` - Quiz definitions
- `question_bank` - Reusable question pool
- `quiz_questions` - Quiz-question associations
- `quiz_attempts` - Student attempts and answers

All tables use UUID primary keys and JSONB for flexible data storage.

## 🚀 API Endpoints

### Assignment Endpoints (17)
```
GET    /api/assignments/{id}                    - Get assignment by ID
GET    /api/assignments/course/{id}             - List course assignments
GET    /api/assignments/course/{id}/published   - Published assignments
GET    /api/assignments/course/{id}/available   - Available assignments
GET    /api/assignments/course/{id}/upcoming    - Upcoming assignments
GET    /api/assignments/course/{id}/overdue     - Overdue assignments
GET    /api/assignments/module/{id}             - Assignments by module
GET    /api/assignments/course/{id}/type/{type} - By assignment type
GET    /api/assignments/course/{id}/search      - Search assignments
POST   /api/assignments                         - Create assignment
PUT    /api/assignments/{id}                    - Update assignment
DELETE /api/assignments/{id}                    - Delete assignment
POST   /api/assignments/{id}/publish            - Publish assignment
POST   /api/assignments/{id}/unpublish          - Unpublish assignment
POST   /api/assignments/{id}/archive            - Archive assignment
POST   /api/assignments/{id}/duplicate          - Duplicate assignment
```

## 🔒 Security

### Authentication
- JWT-based authentication (to be integrated)
- OAuth 2.1 Resource Server support

### Authorization
- Assignment creators can manage their assignments
- Course instructors can manage course assignments
- Students have read-only access to published assignments

### CORS
- Configured for development
- Production domains configurable via environment

## 🗄️ Caching Strategy

- Assignment details cached with Redis
- Cache invalidation on updates
- TTL: 1 hour for assignment data

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
PORT=8082
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
java -jar target/lms-assessment-service-1.0.0-SNAPSHOT.jar
```

### Run with Docker
```bash
docker-compose up lms-assessment-service
```

## 📦 API Response Format

### Success Response
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "assignmentType": "CODE",
  "title": "Algorithm Assignment",
  "description": "Implement sorting algorithms",
  "maxPoints": 100.00,
  "dueDate": "2025-11-20T23:59:59",
  "isPublished": true,
  "isAvailable": true,
  "isOverdue": false,
  "requiresSubmission": true
}
```

### Error Response
```json
{
  "timestamp": "2025-11-13T11:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "Assignment not found with id: uuid",
  "path": "/api/assignments/uuid"
}
```

## 🔄 Migration from Django

This service migrates the following Django models:
- `assessments.Assignment` → `Assignment` entity
- `assessments.Quiz` → `Quiz` entity
- `assessments.QuestionBank` → `QuestionBank` entity
- `assessments.QuizQuestion` → `QuizQuestion` entity
- `assessments.QuizAttempt` → `QuizAttempt` entity

### Key Differences
- UUID primary keys instead of auto-increment
- JSONB for options, answers, metadata
- Native PostgreSQL features
- Redis caching
- Spring Security

## 📈 Performance Considerations

- Database connection pooling with HikariCP
- Query optimization with indexes (18 indexes)
- Redis caching for assignments
- JSONB for flexible data without schema changes
- Efficient pagination

## 📚 Next Steps

1. ⏳ Implement Quiz and Question management endpoints
2. ⏳ Implement Quiz Attempt endpoints (start, submit, grade)
3. ⏳ Build auto-grading engine for code submissions
4. ⏳ Add rubric evaluation system
5. ⏳ Implement peer review workflow
6. ⏳ Add analytics endpoints
7. ⏳ Integrate with Submission Service

## 🤝 Related Services

- **lms-user-service** - User authentication and management
- **lms-course-service** - Course and content management
- **lms-submission-service** - Student submissions (planned)
- **lms-grade-service** - Gradebook management (planned)

## 📄 License

Copyright © 2025 University Learning Management System

