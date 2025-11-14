# 🚀 Course Service Quick Start Guide

## Prerequisites

Before running the Course Service, ensure you have:

- ✅ Java 21 or higher installed
- ✅ PostgreSQL 15+ running
- ✅ Redis 7+ running
- ✅ Maven 3.9+ installed

## Step 1: Database Setup

### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE lms_dev;

# Exit psql
\q
```

### Database will be auto-migrated
Flyway will automatically create tables on first startup.

## Step 2: Redis Setup

### Start Redis (if not running)
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using system service
sudo systemctl start redis
```

## Step 3: Configure Environment

### Option A: Using environment variables
```bash
export DATABASE_URL=jdbc:postgresql://localhost:5432/lms_dev
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

### Option B: Edit application.yml
Edit `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/lms_dev
    username: postgres
    password: your_password
```

## Step 4: Build the Project

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU/backend-spring

# Build all modules
mvn clean install -DskipTests
```

## Step 5: Run the Service

### Option A: Using Maven
```bash
cd lms-course-service
mvn spring-boot:run
```

### Option B: Using JAR
```bash
cd lms-course-service
java -jar target/lms-course-service-1.0.0-SNAPSHOT.jar
```

## Step 6: Verify Service is Running

### Check Health
```bash
curl http://localhost:8081/actuator/health
```

Expected response:
```json
{
  "status": "UP"
}
```

### Check Info
```bash
curl http://localhost:8081/actuator/info
```

## Step 7: Test API Endpoints

### Get Published Courses (Public)
```bash
curl http://localhost:8081/api/courses/published
```

### Create a Course (Requires Auth - Coming Soon)
```bash
curl -X POST http://localhost:8081/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "CS101",
    "titleUk": "Вступ до програмування",
    "titleEn": "Introduction to Programming",
    "descriptionUk": "Базовий курс програмування",
    "descriptionEn": "Basic programming course",
    "visibility": "PUBLIC",
    "status": "PUBLISHED",
    "isPublished": true
  }'
```

### Search Courses
```bash
curl "http://localhost:8081/api/courses/search?q=programming"
```

## Troubleshooting

### Port Already in Use
If port 8081 is busy, change it:
```bash
# Set PORT environment variable
export PORT=8082

# Or edit application.yml
server:
  port: 8082
```

### Database Connection Failed
Check PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

Check database exists:
```bash
psql -U postgres -l | grep lms_dev
```

### Redis Connection Failed
Check Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Flyway Migration Failed
Drop and recreate database:
```bash
psql -U postgres
DROP DATABASE lms_dev;
CREATE DATABASE lms_dev;
\q
```

## Development Mode

### Enable Debug Logging
```bash
export LOG_LEVEL=DEBUG
export SQL_LOG_LEVEL=DEBUG
```

### Hot Reload with Spring DevTools
Add to `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <optional>true</optional>
</dependency>
```

## Running Multiple Services

### Start User Service (Port 8080)
```bash
cd lms-user-service
mvn spring-boot:run
```

### Start Course Service (Port 8081)
```bash
cd lms-course-service
PORT=8081 mvn spring-boot:run
```

## Docker Compose (Coming Soon)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: lms_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  course-service:
    build: ./lms-course-service
    ports:
      - "8081:8081"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: jdbc:postgresql://postgres:5432/lms_dev
      REDIS_HOST: redis
```

## Next Steps

1. ✅ Service is running
2. ⏳ Implement authentication with User Service
3. ⏳ Add Module and Resource management endpoints
4. ⏳ Write unit and integration tests
5. ⏳ Deploy to staging environment

## Useful Commands

```bash
# View logs
tail -f logs/application.log

# Check Actuator metrics
curl http://localhost:8081/actuator/metrics

# View Prometheus metrics
curl http://localhost:8081/actuator/prometheus

# Test database connection
curl http://localhost:8081/actuator/health/db

# Test Redis connection
curl http://localhost:8081/actuator/health/redis
```

## Support

For issues, check:
1. Application logs
2. Database connectivity
3. Redis connectivity
4. Port availability
5. Environment variables

## API Documentation

Full API documentation coming soon with Swagger/OpenAPI integration.

For now, refer to:
- [Course Service README](./lms-course-service/README.md)
- [API Endpoints](./lms-course-service/README.md#-api-endpoints)

