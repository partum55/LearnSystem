# 🚀 Quick Start: Testing the LMS Spring Boot Backend

## Prerequisites Check

```bash
# Check Java version (need 21+)
java -version

# Check Maven
mvn -version

# Check Docker
docker --version
docker ps

# Check required tools for API testing
which curl jq
```

## 1️⃣ Run Unit Tests (Fast - No Containers)

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU

# Run unit tests only
./run-tests.sh unit

# Or with Maven
cd backend-spring
mvn clean test -DskipITs
```

**Expected Output:**
```
[INFO] Tests run: 45, Failures: 0, Errors: 0, Skipped: 0
[SUCCESS] All tests passed! 🎉
```

## 2️⃣ Run Integration Tests (Uses Testcontainers)

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU

# Run integration tests (starts PostgreSQL + Redis in Docker)
./run-tests.sh integration

# Or with Maven
cd backend-spring
mvn clean verify
```

**First Run Note:** Downloads Docker images (~500MB)
- postgres:15-alpine (~250MB)
- redis:7-alpine (~50MB)

**Expected Output:**
```
[INFO] Starting PostgreSQL container...
[INFO] Starting Redis container...
[INFO] Running integration tests...
[INFO] Tests run: 15, Failures: 0, Errors: 0
[SUCCESS] All tests passed! 🎉
```

## 3️⃣ Run Tests for Specific Service

```bash
# Test User Service
./run-tests.sh service user

# Test Course Service
./run-tests.sh service course

# Test Assessment Service
./run-tests.sh service assessment
```

## 4️⃣ Generate Coverage Report

```bash
./run-tests.sh coverage

# View reports
open backend-spring/lms-user-service/target/site/jacoco/index.html
open backend-spring/lms-course-service/target/site/jacoco/index.html
open backend-spring/lms-assessment-service/target/site/jacoco/index.html
```

## 5️⃣ Test Live API Endpoints (E2E Testing)

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU

# Start services and run API tests
./test-api-endpoints.sh
```

**What it does:**
1. Starts Docker Compose services (postgres, redis, spring-boot)
2. Waits for services to be healthy
3. Tests ALL API endpoints:
   - ✅ Register users (student & teacher)
   - ✅ Login and get JWT tokens
   - ✅ Get user profile
   - ✅ Create courses
   - ✅ Create modules
   - ✅ Create quizzes
   - ✅ Search courses
   - ✅ Update resources
4. Generates test report with pass/fail counts

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════╗
║   LMS Spring Boot API Endpoint Testing Suite             ║
║   Testing User, Course, Assessment & AI Services         ║
╚═══════════════════════════════════════════════════════════╝

[INFO] Starting Docker Compose services...
[SUCCESS] Spring Boot Backend is ready!

========================================
Testing Authentication Endpoints
========================================
[SUCCESS] Register student user - Status: 201
[SUCCESS] Register teacher user - Status: 201
[SUCCESS] Login with student credentials - Status: 200
[SUCCESS] Login with teacher credentials - Status: 200

========================================
Testing Course Management Endpoints
========================================
[SUCCESS] Create a new course - Status: 201
[SUCCESS] Get course by ID - Status: 200
[SUCCESS] Search courses - Status: 200

========================================
Test Summary
========================================
Total Tests: 25
Passed: 25
Failed: 0

[SUCCESS] All tests passed! 🎉
```

## 🐛 Troubleshooting

### Issue: Port Already in Use

```bash
# Kill processes using test ports
sudo lsof -ti:8080 | xargs kill -9
sudo lsof -ti:5432 | xargs kill -9
sudo lsof -ti:6379 | xargs kill -9

# Or stop Docker Compose
docker-compose down
```

### Issue: Testcontainers Not Starting

```bash
# Check Docker is running
docker ps

# Pull images manually
docker pull postgres:15-alpine
docker pull redis:7-alpine

# Clean up Docker
docker system prune -af
```

### Issue: Tests Fail Due to Missing Dependencies

```bash
cd backend-spring

# Clean and rebuild
mvn clean install -DskipTests

# Verify dependencies
mvn dependency:tree
```

### Issue: JQ Not Installed (for API testing)

```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Or run without jq (limited JSON parsing)
./test-api-endpoints.sh
```

## 📊 Understanding Test Results

### Maven Test Output

```
[INFO] --- maven-surefire-plugin:3.2.5:test
[INFO] 
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.university.lms.user.web.AuthControllerTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 45, Failures: 0, Errors: 0, Skipped: 0
```

### Coverage Report

Open `target/site/jacoco/index.html` to see:
- Line coverage by package
- Branch coverage
- Method coverage
- Detailed file-by-file analysis

### API Test Report

```
Total Tests: 25
Passed: 25      ← All API endpoints working
Failed: 0       ← No failures
```

## 🎯 Test Execution Time

| Test Type | Typical Duration | Containers |
|-----------|------------------|------------|
| Unit Tests | 30-60 seconds | None |
| Integration Tests | 2-4 minutes | PostgreSQL + Redis |
| API Tests (E2E) | 3-5 minutes | All services |
| Coverage Report | 3-5 minutes | PostgreSQL + Redis |

## 📝 Next Steps

After tests pass:

1. **View Coverage Reports**
   ```bash
   ./run-tests.sh coverage
   open backend-spring/lms-user-service/target/site/jacoco/index.html
   ```

2. **Run Specific Test Class**
   ```bash
   cd backend-spring/lms-user-service
   mvn test -Dtest=AuthControllerTest
   ```

3. **Debug Failing Test**
   - Open test in IDE (IntelliJ IDEA)
   - Set breakpoints
   - Right-click → Debug test

4. **Add More Tests**
   - See `TESTING_GUIDE.md` for patterns
   - Use existing test factories
   - Follow naming conventions

## ✅ Success Checklist

- [ ] Unit tests pass (`./run-tests.sh unit`)
- [ ] Integration tests pass (`./run-tests.sh integration`)
- [ ] Coverage > 50% (`./run-tests.sh coverage`)
- [ ] API tests pass (`./test-api-endpoints.sh`)
- [ ] No compilation errors
- [ ] Docker containers start successfully

## 📚 Further Reading

- `TESTING_GUIDE.md` - Comprehensive testing documentation
- `TEST_IMPLEMENTATION_SUMMARY.md` - What's been implemented
- [Spring Boot Testing Docs](https://spring.io/guides/gs/testing-web/)
- [Testcontainers Docs](https://www.testcontainers.org/)

---

## 🚀 TL;DR - Run Everything

```bash
cd /home/parum/IdeaProjects/LearnSystemUCU

# Run all tests
./run-tests.sh

# If all pass, run API tests
./test-api-endpoints.sh

# View coverage
./run-tests.sh coverage
open backend-spring/lms-user-service/target/site/jacoco/index.html
```

**Expected Result:** All tests pass ✅

Need help? See `TESTING_GUIDE.md` for detailed troubleshooting!

