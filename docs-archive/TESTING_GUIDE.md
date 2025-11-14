# Testing Guide for LMS Spring Boot Backend

This guide covers all testing approaches for the LMS Spring Boot microservices.

## 📋 Table of Contents

1. [Test Structure](#test-structure)
2. [Running Tests](#running-tests)
3. [Test Types](#test-types)
4. [API Endpoint Testing](#api-endpoint-testing)
5. [Writing Tests](#writing-tests)
6. [CI/CD Integration](#cicd-integration)

## 🏗️ Test Structure

```
backend-spring/
├── lms-user-service/
│   └── src/test/java/
│       ├── BaseIntegrationTest.java          # Base class for integration tests
│       ├── util/
│       │   ├── TestDataFactory.java          # Test data builders
│       │   └── JwtTestHelper.java            # JWT token generation for tests
│       └── web/
│           ├── AuthControllerTest.java       # Unit tests for AuthController
│           ├── UserControllerTest.java       # Unit tests for UserController
│           └── AuthIntegrationTest.java      # Integration tests
├── lms-course-service/
│   └── src/test/java/
│       ├── BaseIntegrationTest.java
│       ├── util/
│       │   └── CourseTestDataFactory.java
│       └── web/
│           └── CourseControllerTest.java
├── lms-assessment-service/
│   └── src/test/java/
│       ├── BaseIntegrationTest.java
│       ├── util/
│       │   └── AssessmentTestDataFactory.java
│       └── web/
│           └── QuizControllerTest.java
└── lms-ai-service/
    └── src/test/java/
```

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests (unit + integration)
./run-tests.sh

# Or using Maven directly
cd backend-spring
mvn clean verify
```

### Specific Test Types

```bash
# Run only unit tests (fast, no containers)
./run-tests.sh unit

# Run only integration tests (uses Testcontainers)
./run-tests.sh integration

# Run tests for a specific service
./run-tests.sh service user
./run-tests.sh service course
./run-tests.sh service assessment

# Generate coverage reports
./run-tests.sh coverage
```

### Manual Maven Commands

```bash
cd backend-spring

# Run all tests in all modules
mvn clean verify

# Run tests for specific module
cd lms-user-service
mvn test

# Skip tests during build
mvn clean install -DskipTests

# Run with specific test class
mvn test -Dtest=AuthControllerTest

# Run with specific test method
mvn test -Dtest=AuthControllerTest#register_WithValidData_ShouldReturnCreatedUser
```

## 🧪 Test Types

### 1. Unit Tests

**Location**: `*ControllerTest.java`, `*ServiceTest.java`

**Purpose**: Test individual components in isolation using mocks

**Example**:
```java
@WebMvcTest(AuthController.class)
class AuthControllerTest {
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private UserService userService;
    
    @Test
    void register_WithValidData_ShouldReturnCreatedUser() throws Exception {
        // Test implementation
    }
}
```

**Run**: `mvn test` (fast, no containers needed)

### 2. Integration Tests

**Location**: `*IntegrationTest.java`

**Purpose**: Test complete request flow with real database and Redis

**Example**:
```java
class AuthIntegrationTest extends BaseIntegrationTest {
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void testCompleteAuthenticationFlow() {
        // Register -> Login -> Access protected resource
    }
}
```

**Run**: `mvn verify` (uses Testcontainers - PostgreSQL & Redis)

### 3. Repository Tests

**Purpose**: Test database interactions with `@DataJpaTest`

**Example**:
```java
@DataJpaTest
class UserRepositoryTest {
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void findByEmail_WhenExists_ShouldReturnUser() {
        // Test implementation
    }
}
```

### 4. Service Layer Tests

**Purpose**: Test business logic with mocked repositories

**Example**:
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    void registerUser_WithValidData_ShouldSaveUser() {
        // Test implementation
    }
}
```

## 🌐 API Endpoint Testing

### Automated API Testing with Docker Compose

Test all API endpoints with running services:

```bash
# Start services and run comprehensive API tests
./test-api-endpoints.sh
```

This script will:
1. ✅ Start all services via docker-compose
2. ✅ Wait for services to be healthy
3. ✅ Test authentication endpoints (register, login)
4. ✅ Test user management endpoints
5. ✅ Test course management endpoints
6. ✅ Test module endpoints
7. ✅ Test quiz and assignment endpoints
8. ✅ Generate test report

### Manual API Testing

```bash
# Start services
docker-compose up -d

# Wait for services to be ready
curl http://localhost:8080/api/actuator/health

# Test authentication
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ucu.edu.ua",
    "password": "TestPass123",
    "displayName": "Test User",
    "role": "STUDENT"
  }'

# Login and get token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ucu.edu.ua",
    "password": "TestPass123"
  }' | jq -r '.accessToken')

# Use token for authenticated requests
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

## ✍️ Writing Tests

### Test Naming Convention

```
methodName_WhenCondition_ShouldExpectedBehavior
```

Examples:
- `register_WithValidData_ShouldReturnCreatedUser`
- `login_WithInvalidCredentials_ShouldReturnUnauthorized`
- `getCourse_WhenNotExists_ShouldReturnNotFound`

### Using Test Data Factories

```java
// Create test data easily
RegisterRequest request = TestDataFactory.createValidRegisterRequest();
User user = TestDataFactory.createStudentUser();
Course course = CourseTestDataFactory.createCourse(teacherId);
```

### Using JWT Test Helper

```java
// Generate test tokens
String studentToken = JwtTestHelper.generateStudentToken();
String teacherToken = JwtTestHelper.generateTeacherToken();
UUID userId = UUID.randomUUID();
String userToken = JwtTestHelper.generateTokenWithUserId(userId);
```

### Testing with Security

```java
// Option 1: Use @WithMockUser
@Test
@WithMockUser(roles = "TEACHER")
void createCourse_AsTeacher_ShouldSucceed() {
    // Test implementation
}

// Option 2: Use JWT token in request
@Test
void createCourse_WithValidToken_ShouldSucceed() {
    String token = JwtTestHelper.generateTeacherToken();
    mockMvc.perform(post("/courses")
        .header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content(requestBody))
        .andExpect(status().isCreated());
}
```

### Assertions with AssertJ

```java
import static org.assertj.core.api.Assertions.*;

// More readable assertions
assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
assertThat(user.getEmail()).isEqualTo("test@ucu.edu.ua");
assertThat(courses).hasSize(3);
assertThat(courseDto.getId()).isNotNull();
```

## 🔄 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/tests.yml`:

```yaml
name: Run Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 21
      uses: actions/setup-java@v3
      with:
        java-version: '21'
        distribution: 'temurin'
        cache: maven
    
    - name: Run Unit Tests
      run: |
        cd backend-spring
        mvn clean test -DskipITs
    
    - name: Run Integration Tests
      run: |
        cd backend-spring
        mvn verify -DskipUTs
    
    - name: Generate Coverage Report
      run: |
        cd backend-spring
        mvn jacoco:report
    
    - name: Upload Coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./backend-spring/lms-user-service/target/site/jacoco/jacoco.xml
```

## 📊 Test Coverage

View coverage reports after running:

```bash
./run-tests.sh coverage
```

Reports location:
- User Service: `backend-spring/lms-user-service/target/site/jacoco/index.html`
- Course Service: `backend-spring/lms-course-service/target/site/jacoco/index.html`
- Assessment Service: `backend-spring/lms-assessment-service/target/site/jacoco/index.html`

Open in browser:
```bash
open backend-spring/lms-user-service/target/site/jacoco/index.html
```

## 🐛 Debugging Tests

### Run tests in debug mode (IntelliJ IDEA)

1. Right-click on test class/method
2. Select "Debug 'TestName'"
3. Set breakpoints as needed

### View detailed test output

```bash
mvn test -X  # Debug mode with detailed logs
mvn test -Dtest=AuthControllerTest -Dmaven.surefire.debug  # Remote debugging
```

### Check Testcontainers logs

```bash
# Testcontainers reuse containers by default
docker ps  # See running containers
docker logs <container-id>
```

## 📝 Best Practices

1. ✅ **Test one thing at a time** - Each test should verify a single behavior
2. ✅ **Use descriptive test names** - Follow the naming convention
3. ✅ **Arrange-Act-Assert pattern** - Structure tests clearly
4. ✅ **Clean up after tests** - Use `@AfterEach` or `@DirtiesContext`
5. ✅ **Don't test framework code** - Focus on your business logic
6. ✅ **Mock external dependencies** - Use Mockito for unit tests
7. ✅ **Use test data factories** - Keep test data creation consistent
8. ✅ **Test both happy and sad paths** - Include error scenarios
9. ✅ **Keep tests fast** - Use unit tests for most cases
10. ✅ **Make tests independent** - Tests shouldn't depend on each other

## 🆘 Troubleshooting

### Tests fail with "Port already in use"

```bash
# Kill processes using ports
sudo lsof -ti:8080 | xargs kill -9
sudo lsof -ti:5432 | xargs kill -9
sudo lsof -ti:6379 | xargs kill -9
```

### Testcontainers fail to start

```bash
# Check Docker is running
docker ps

# Pull required images
docker pull postgres:15-alpine
docker pull redis:7-alpine

# Clean up old containers
docker system prune -af
```

### Maven dependency issues

```bash
# Clean and rebuild
cd backend-spring
mvn clean install -DskipTests
mvn dependency:tree  # Check dependency tree
```

## 📚 Additional Resources

- [Spring Boot Testing Documentation](https://spring.io/guides/gs/testing-web/)
- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [Testcontainers Documentation](https://www.testcontainers.org/)
- [AssertJ Documentation](https://assertj.github.io/doc/)

---

## 🎯 Quick Reference

```bash
# Run all tests
./run-tests.sh

# Unit tests only (fast)
./run-tests.sh unit

# Integration tests
./run-tests.sh integration

# Test specific service
./run-tests.sh service user

# Coverage report
./run-tests.sh coverage

# API endpoint tests
./test-api-endpoints.sh

# Single test class
cd backend-spring/lms-user-service
mvn test -Dtest=AuthControllerTest

# Single test method
mvn test -Dtest=AuthControllerTest#register_WithValidData_ShouldReturnCreatedUser
```

