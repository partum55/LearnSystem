# Quick Start Guide: Testing Spring Boot Services with Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Java 21 installed (for local Maven builds)
- Maven installed

## Step 1: Fix and Build

The POM.xml has been fixed and tests have been updated. Build the project:

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU/backend-spring
mvn clean install -DskipTests
```

## Step 2: Start Services with Docker Compose

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU
docker-compose up --build -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- User Service (port 8081)
- Course Service (port 8082)
- Assessment Service (port 8083)
- AI Service (port 8084)

## Step 3: Check Service Status

Wait for services to start (30-60 seconds), then check:

```bash
# Check running containers
docker-compose ps

# Check logs
docker-compose logs -f

# Check specific service
docker-compose logs -f lms-user-service
```

## Step 4: Test API Endpoints

Use the provided test script:

```bash
./test-spring-api.sh
```

Or test manually:

### Health Checks

```bash
# User Service
curl http://localhost:8081/actuator/health

# Course Service
curl http://localhost:8082/actuator/health

# Assessment Service  
curl http://localhost:8083/actuator/health

# AI Service
curl http://localhost:8084/actuator/health
```

### User Registration

```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@ucu.edu.ua",
    "password": "StudentPass123",
    "displayName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "locale": "EN"
  }'
```

### User Login

```bash
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@ucu.edu.ua",
    "password": "StudentPass123"
  }'
```

Save the returned `accessToken` for authenticated requests.

### Authenticated Requests

```bash
# Get current user profile
curl http://localhost:8081/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get all courses
curl http://localhost:8082/api/v1/courses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Step 5: Run Unit Tests Locally

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU/backend-spring

# Run all tests
mvn test

# Run specific service tests
mvn test -pl lms-user-service

# Run only unit tests (exclude integration tests)
mvn test -Dtest=*Test,!*IntegrationTest
```

## Step 6: Run Integration Tests

Integration tests require Testcontainers (Docker):

```bash
# Run integration tests
mvn verify

# Run specific integration test
mvn test -Dtest=AuthIntegrationTest -pl lms-user-service
```

## Test Status

### ✅ Fixed Issues

1. **POM.xml**: Duplicated pluginManagement tag - FIXED
2. **UserServiceTest**: Missing mocks and wrong method names - FIXED (7/7 passing)
3. **TestDataFactory**: Wrong setter names and enum values - FIXED
4. **Controller Tests**: Missing bean mocks - FIXED

### 📊 Current Test Results

- **Unit Tests**: UserServiceTest (7/7 passing) ✅
- **Controller Tests**: Require ApplicationContext setup
- **Integration Tests**: Available for end-to-end testing

## Troubleshooting

### Services won't start

```bash
# Check for port conflicts
netstat -tulpn | grep -E ':(8081|8082|8083|8084|5432|6379)'

# Rebuild containers
docker-compose down -v
docker-compose up --build
```

### Database connection errors

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Connect to database directly
docker-compose exec postgres psql -U postgres -d lms_db
```

### Test failures

```bash
# Clean and rebuild
mvn clean install -DskipTests

# Check for compilation errors
mvn compile

# Run with debug logging
mvn test -X
```

## Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart lms-user-service

# Execute command in container
docker-compose exec lms-user-service bash

# Scale a service
docker-compose up --scale lms-user-service=3
```

## API Endpoints Summary

### User Service (Port 8081)

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT tokens
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh access token
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/{id}` - Get user by ID
- `PUT /api/v1/users/me` - Update current user
- `GET /api/v1/users` - List all users (admin only)

### Course Service (Port 8082)

- `GET /api/v1/courses` - List all courses
- `POST /api/v1/courses` - Create course (teacher only)
- `GET /api/v1/courses/{id}` - Get course details
- `PUT /api/v1/courses/{id}` - Update course
- `DELETE /api/v1/courses/{id}` - Delete course
- `POST /api/v1/courses/{id}/enroll` - Enroll in course

### Assessment Service (Port 8083)

- `GET /api/v1/assessments` - List assessments
- `POST /api/v1/assessments` - Create assessment
- `GET /api/v1/assessments/{id}` - Get assessment
- `POST /api/v1/assessments/{id}/submit` - Submit assessment
- `GET /api/v1/assessments/{id}/grades` - Get grades

### AI Service (Port 8084)

- `POST /api/v1/ai/generate` - Generate AI content
- `POST /api/v1/ai/analyze` - Analyze text
- `POST /api/v1/ai/feedback` - Get AI feedback

## Next Steps

1. ✅ POM configuration fixed
2. ✅ Unit tests fixed and passing
3. ⏳ Test with Docker Compose
4. ⏳ Run integration tests
5. ⏳ Test frontend integration
6. ⏳ Deploy to production

For more details, see:
- `TEST_STATUS_SUMMARY.md` - Detailed test status
- `TESTING_GUIDE.md` - Comprehensive testing guide
- `QUICKSTART.md` - Project quickstart guide

