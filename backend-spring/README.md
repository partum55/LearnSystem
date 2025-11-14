# LMS Spring Boot Backend

Enterprise-grade Learning Management System backend built with Spring Boot 3.2, implementing microservices architecture for scalability and maintainability.

## 🏗️ Architecture

This is a multi-module Maven project following Domain-Driven Design (DDD) principles:

```
backend-spring/
├── lms-common/              # Shared utilities, DTOs, exceptions
├── lms-user-service/        # User management & authentication
├── lms-course-service/      # Course management (planned)
├── lms-assessment-service/  # Assessment engine (planned)
├── lms-submission-service/  # Submission processing (planned)
├── lms-grade-service/       # Gradebook management (planned)
├── lms-notification-service/# Communication hub (planned)
├── lms-analytics-service/   # Business intelligence (planned)
└── lms-api-gateway/         # API Gateway (planned)
```

## 🚀 Technology Stack

- **Java 21** (LTS with Virtual Threads support)
- **Spring Boot 3.2.2** (Latest stable)
- **Spring Security 6** (OAuth 2.1 + JWT)
- **Spring Data JPA** (with Hibernate 6)
- **PostgreSQL 15** (Primary database)
- **Redis 7** (Caching & sessions)
- **Flyway** (Database migrations)
- **MapStruct** (DTO mapping)
- **Lombok** (Boilerplate reduction)
- **Micrometer + Prometheus** (Monitoring)

## 📋 Current Implementation Status

### ✅ Phase 1: Core Services (Completed)

#### User Service
- [x] User entity with UUID primary key
- [x] Role-based access control (SUPERADMIN, TEACHER, STUDENT, TA)
- [x] Email-based authentication
- [x] JWT token generation & validation
- [x] Password encryption with BCrypt
- [x] User registration & login
- [x] Email verification (token-based)
- [x] Password reset flow
- [x] User profile management
- [x] User search & pagination
- [x] Redis caching for users
- [x] Flyway database migrations
- [x] Global exception handling
- [x] Security configuration with JWT filter
- [x] REST API endpoints matching Django URLs

#### Common Module
- [x] Domain enums (UserRole, UserLocale, CourseVisibility, CourseStatus)
- [x] Base exceptions (LmsException, ResourceNotFoundException, ValidationException, AccessDeniedException)
- [x] Common DTOs (ErrorResponse, PageResponse)
- [x] Shared utilities

#### Course Service ✅
- [x] Course entity with multilingual support (UK/EN)
- [x] Course visibility controls (PUBLIC, PRIVATE, DRAFT)
- [x] Course status management (DRAFT, PUBLISHED, ARCHIVED)
- [x] Course membership & enrollment system
- [x] Role-based course access (TEACHER, TA, STUDENT)
- [x] Enrollment capacity management
- [x] Module-based content organization
- [x] Resource management (VIDEO, PDF, SLIDE, LINK, TEXT, CODE)
- [x] Academic year & department tracking
- [x] Course search & filtering with pagination
- [x] Redis caching for course data
- [x] Flyway database migrations
- [x] REST API endpoints with full CRUD
- [x] Permission-based authorization
- [x] Self-enrollment and drop functionality

### 🔄 Phase 2: Assessment & Submission Services (Next)

#### Assessment Service (Planned)
- [ ] Assignment creation (QUIZ, FILE_UPLOAD, TEXT, CODE)
- [ ] Quiz management
- [ ] Auto-grading engine
- [ ] Rubric evaluation

#### Assessment Service (Planned)
- [ ] Assignment creation (QUIZ, FILE_UPLOAD, TEXT, CODE)
- [ ] Quiz management
- [ ] Auto-grading engine
- [ ] Rubric evaluation

## 🔧 Prerequisites

- **Java 21** or higher
- **Maven 3.9+**
- **Docker & Docker Compose** (for containerized deployment)
- **PostgreSQL 15** (if running locally)
- **Redis 7** (if running locally)

## 🏃 Running the Application

### Option 1: Docker Compose (Recommended)

```bash
# Navigate to project root
cd /home/parum/IdeaProjects/LearnSystemUCU

# Start all services (PostgreSQL, Redis, Spring Boot)
docker-compose up -d backend-spring

# View logs
docker-compose logs -f backend-spring

# Stop services
docker-compose down
```

### Option 2: Local Development

```bash
# Navigate to backend-spring directory
cd backend-spring

# Install dependencies and build
mvn clean install

# Run user service
cd lms-user-service
mvn spring-boot:run

# Or run with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Option 3: Run as JAR

```bash
# Build the project
mvn clean package -DskipTests

# Run the JAR
java -jar lms-user-service/target/lms-user-service-1.0.0-SNAPSHOT.jar
```

## 🔐 Environment Variables

Create a `.env` file in the project root:

```bash
# Database
POSTGRES_DB=lms_db
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here-must-be-very-long
JWT_EXPIRATION=86400000  # 24 hours
JWT_REFRESH_EXPIRATION=2592000000  # 30 days

# Redis
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Logging
LOG_LEVEL=DEBUG
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/verify-email` | Verify email with token | No |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| POST | `/api/auth/refresh` | Refresh access token | Yes |
| POST | `/api/auth/logout` | Logout user | Yes |

### User Management (`/api/users`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/users/me` | Get current user | Yes | Any |
| PUT | `/api/users/me` | Update current user | Yes | Any |
| POST | `/api/users/me/change-password` | Change password | Yes | Any |
| GET | `/api/users/{id}` | Get user by ID | Yes | Any |
| GET | `/api/users` | Search users | Yes | TEACHER, SUPERADMIN |
| PUT | `/api/users/{id}` | Update user (admin) | Yes | SUPERADMIN |
| POST | `/api/users/{id}/activate` | Activate user | Yes | SUPERADMIN |
| POST | `/api/users/{id}/deactivate` | Deactivate user | Yes | SUPERADMIN |
| DELETE | `/api/users/{id}` | Delete user | Yes | SUPERADMIN |

### Health & Monitoring (`/api/actuator`)

| Endpoint | Description |
|----------|-------------|
| `/api/actuator/health` | Application health status |
| `/api/actuator/info` | Application information |
| `/api/actuator/prometheus` | Prometheus metrics |
| `/api/actuator/metrics` | Application metrics |

## 🧪 Testing

### Run all tests
```bash
mvn test
```

### Run tests for specific module
```bash
mvn test -pl lms-user-service
```

### Run with coverage
```bash
mvn clean verify
```

## 📊 Database Migrations

Flyway migrations are located in `lms-user-service/src/main/resources/db/migration/`

### Current migrations:
- **V001__Create_users_table.sql** - Creates users table with enums, indexes, and triggers

### Apply migrations manually:
```bash
mvn flyway:migrate -pl lms-user-service
```

### View migration status:
```bash
mvn flyway:info -pl lms-user-service
```

## 🔍 Monitoring & Observability

### Prometheus Metrics
Access metrics at: `http://localhost:8080/api/actuator/prometheus`

### Health Check
```bash
curl http://localhost:8080/api/actuator/health
```

### Application Logs
Logs are written to `logs/lms-user-service.log` and console.

## 🐛 Troubleshooting

### Port already in use
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Connect to PostgreSQL
docker-compose exec postgres psql -U lms_user -d lms_db
```

### Redis connection issues
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

## 📝 Development Guidelines

### Code Style
- Follow Java naming conventions
- Use Lombok annotations to reduce boilerplate
- Keep methods small and focused
- Write meaningful comments for complex logic

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/user-service-implementation

# Commit changes
git add .
git commit -m "feat: implement user registration and authentication"

# Push to remote
git push origin feature/user-service-implementation
```

### Commit Message Format
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## 📚 Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Security Documentation](https://spring.io/projects/spring-security)
- [Flyway Documentation](https://flywaydb.org/documentation/)
- [MapStruct Documentation](https://mapstruct.org/)
- [Migration Plan](../DJANGO_TO_SPRING_MIGRATION.md)

## 🤝 Contributing

1. Read the migration plan in `DJANGO_TO_SPRING_MIGRATION.md`
2. Check current implementation status above
3. Create a feature branch
4. Implement the feature with tests
5. Submit a pull request

## 📄 License

See [LICENSE](../LICENSE) file in the project root.

