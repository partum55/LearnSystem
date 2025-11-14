# Enterprise-Grade Migration Plan: Django LMS → Spring Boot Ecosystem

## 🎯 Стратегічний огляд проєкту

Learning Management System (LMS) - корпоративна система управління навчанням для університету з high-availability архітектурою та enterprise-grade безпекою.

### 📊 Поточна архітектура (Django Ecosystem)
- **Backend**: Django 5.1.13 + Django REST Framework 3.15.2
- **Frontend**: React 18.2.0 + TypeScript 4.9.5 + TailwindCSS 3.3.6
- **Database**: PostgreSQL 15 (production) / SQLite (development)
- **Caching**: Redis 7 + django-redis 5.4.0
- **Message Broker**: Celery 5.4.0 + Redis
- **Storage**: Local/AWS S3/Supabase Storage + django-storages
- **Authentication**: JWT (simplejwt) + Cookie-based sessions
- **Security**: CSP, CORS, Rate Limiting, Security Headers
- **Monitoring**: Django logging + file handlers
- **Deployment**: Docker Compose + Render.com
- **CI/CD**: GitHub Actions (implied from render.yaml)

### 🏗️ Цільова архітектура (Spring Boot Ecosystem)
- **Backend**: Spring Boot 3.2.x + Spring Security 6.x
- **Microservices**: Spring Cloud Gateway + Service Discovery
- **Database**: PostgreSQL 15 + Spring Data JPA + Flyway
- **Caching**: Redis Cluster + Spring Cache + Caffeine
- **Message Broker**: Apache Kafka + Spring Kafka / RabbitMQ
- **Storage**: MinIO Cluster / AWS S3 + Spring Cloud AWS
- **Authentication**: OAuth 2.1 + JWT + Spring Security
- **Security**: Zero Trust Architecture + OWASP compliance
- **Monitoring**: Micrometer + Prometheus + Grafana
- **Deployment**: Kubernetes + Helm Charts
- **CI/CD**: GitOps with ArgoCD

## 🔍 Детальні технічні характеристики

### 1. Архітектурні модулі та домени

#### 🏛️ Core Domain Services
1. **core** - Системні сервіси, аудит, календар, безпека
   - Audit logging з UUID tracing
   - Calendar events з iCal підтримкою  
   - Security headers middleware (CSP, HSTS, XSS)
   - Rate limiting (200 req/min API, 20 req/5min auth)
   - Content Security Policy з nonce-based scripts

2. **users** - Identity & Access Management (IAM)
   - Custom User model з UUID PK
   - RBAC з 4 ролями: SUPERADMIN, TEACHER, TA, STUDENT
   - Email-based authentication + verification
   - Multi-language support (uk/en)
   - User preferences (JSON storage)
   - Password policies + reset tokens

3. **courses** - Academic Content Management
   - Multilingual courses (title_uk/title_en)
   - Course membership з role-based permissions
   - Module-based content organization
   - Enrollment management + capacity limits
   - Academic year tracking

4. **assessments** - Assessment Engine
   - Multi-type assignments (QUIZ, FILE_UPLOAD, TEXT, CODE, URL)
   - Rich content support (Markdown, HTML, LaTeX)
   - Auto-grading для code submissions
   - Rubric-based evaluation
   - Peer review workflows
   - Late submission penalties

5. **submissions** - Submission Management
   - File upload з validation (type, size, count)
   - Text submissions + code highlighting
   - Version control for submissions
   - Anti-plagiarism hooks
   - Grade distribution tracking

6. **gradebook** - Academic Records
   - Category-based grade weighting
   - Grade calculations + statistics
   - Export capabilities (Excel, CSV)
   - Grade history + audit trails
   - Parent/guardian access controls

7. **notifications** - Communication Hub
   - Multi-channel notifications (email, in-app)
   - Event-driven notification triggers
   - User preference management
   - Digest + real-time notifications
   - Template-based messages

8. **analytics** - Business Intelligence
   - Course performance metrics
   - Student engagement analytics
   - Learning outcome tracking
   - Custom reporting dashboards
   - Data export for external analysis

### 2. 🛡️ Поточна безпека та compliance

#### Безпекові заходи Django
```python
# Security Headers Middleware
- Content-Security-Policy з nonce
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy обмеження

# Rate Limiting
- API: 200 requests/min/IP
- Auth: 20 requests/5min/IP  
- Upload: 20 requests/hour/user
- Bypass for SUPERADMIN role

# RBAC Permission Matrix
- Fine-grained permissions per action
- Resource-level authorization
- Ownership-based access ('own' objects)
- Assignment-based access (TA groups)
```

#### Аутентифікація та авторизація
```python
# JWT Configuration
- Access Token: 24 години
- Refresh Token: 30 днів з rotation
- HTTP-only cookies для frontend
- Blacklist після rotation
- Email verification required

# CORS Security
- Explicit allowed origins
- Credentials only для allowed origins
- Preflight request validation
```

### 3. 📊 Performance Metrics та масштабування

#### Поточні метрики
- **Database**: PostgreSQL з connection pooling
- **Cache Hit Ratio**: Redis з 5 min default TTL
- **File Storage**: Multi-provider (S3/Supabase/Local)
- **Background Jobs**: Celery з Redis broker
- **API Response Time**: <200ms для простих запитів
- **File Upload**: до 10MB, 5 files max

#### Bottlenecks та обмеження
- Синхронна обробка file uploads
- Single-instance deployment
- No horizontal scaling
- Limited caching strategy
- No CDN integration
- Manual database migrations

### 4. 📋 Моделі даних та бізнес-правила

#### Identity Management (users module)
```java
// User Entity - Core Identity
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email"),
    @Index(name = "idx_user_role", columnList = "role"),
    @Index(name = "idx_user_student_id", columnList = "student_id")
})
public class User {
    @Id @GeneratedValue
    private UUID id;
    
    @Column(unique = true, nullable = false, length = 254)
    @Email @NotBlank
    private String email;
    
    @Column(name = "display_name", length = 150)
    private String displayName;
    
    @Column(name = "student_id", unique = true, length = 50)
    private String studentId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.STUDENT;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserLocale locale = UserLocale.UK;
    
    @Column(name = "password_hash", length = 128)
    private String passwordHash;
    
    @Column(name = "is_active")
    private boolean isActive = true;
    
    @Column(name = "email_verified")
    private boolean emailVerified = false;
    
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> preferences = new HashMap<>();
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // Business Rules:
    // - Email must be institutional (.edu domain)
    // - Student ID format validation
    // - Role transition restrictions
    // - Account deactivation cascading
}
```

#### Academic Management (courses module)
```java
// Course Entity - Academic Content Container
@Entity
@Table(name = "courses")
public class Course {
    @Id @GeneratedValue
    private UUID id;
    
    @Column(unique = true, nullable = false, length = 50)
    @Pattern(regexp = "^[A-Z]{2,4}[0-9]{3,4}$") // CS101, MATH2020
    private String code;
    
    @Column(name = "title_uk", nullable = false)
    private String titleUk;
    
    @Column(name = "title_en")
    private String titleEn;
    
    @Lob @Column(name = "description_uk")
    private String descriptionUk;
    
    @Lob @Column(name = "description_en") 
    private String descriptionEn;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
    
    @Enumerated(EnumType.STRING)
    private CourseVisibility visibility = CourseVisibility.DRAFT;
    
    @Column(name = "max_students")
    @Min(1) @Max(1000)
    private Integer maxStudents;
    
    @Column(name = "academic_year", length = 20)
    @Pattern(regexp = "^\\d{4}-\\d{4}$") // 2024-2025
    private String academicYear;
    
    // Business Rules:
    // - Owner must be TEACHER or SUPERADMIN
    // - Course code must be unique per academic year
    // - Published courses cannot be deleted
    // - Enrollment limits enforcement
}

// Course Membership - Association Entity
@Entity
@Table(name = "course_members", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"course_id", "user_id"}))
public class CourseMember {
    @Id @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_course")
    private CourseRole roleInCourse;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "enrollment_status")
    private EnrollmentStatus enrollmentStatus = EnrollmentStatus.ACTIVE;
    
    @Column(name = "final_grade", precision = 5, scale = 2)
    @DecimalMin("0.00") @DecimalMax("100.00")
    private BigDecimal finalGrade;
    
    // Business Rules:
    // - User can have only one role per course
    // - Grade calculations based on category weights
    // - Enrollment date restrictions
}
```

#### Assessment Engine (assessments module)
```java
// Assignment Entity - Flexible Assessment Container
@Entity
@Table(name = "assignments")
public class Assignment {
    @Id @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private Module module;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_type", nullable = false)
    private AssignmentType assignmentType;
    
    @Column(nullable = false)
    private String title;
    
    @Lob
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "description_format")
    private ContentFormat descriptionFormat = ContentFormat.MARKDOWN;
    
    @Column(name = "max_points", precision = 6, scale = 2)
    @DecimalMin("0.01") @DecimalMax("9999.99")
    private BigDecimal maxPoints = new BigDecimal("100.00");
    
    @Column(name = "due_date")
    private LocalDateTime dueDate;
    
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private AssignmentSettings settings = new AssignmentSettings();
    
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb") 
    private List<String> allowedFileTypes = new ArrayList<>();
    
    @Column(name = "max_file_size")
    @Min(1024) @Max(104857600) // 1KB - 100MB
    private Integer maxFileSize = 10485760; // 10MB
    
    // Business Rules:
    // - Due date must be after available_from
    // - File type restrictions enforcement
    // - Auto-grading configuration validation
    // - Rubric consistency checks
}

// Quiz Entity - Structured Assessment
@Entity
@Table(name = "quizzes")
public class Quiz {
    @Id @GeneratedValue
    private UUID id;
    
    @OneToOne(mappedBy = "quiz")
    private Assignment assignment;
    
    @Column(name = "time_limit_minutes")
    @Min(1) @Max(300) // 1-300 minutes
    private Integer timeLimitMinutes;
    
    @Column(name = "randomize_questions")
    private boolean randomizeQuestions = false;
    
    @Column(name = "show_results_immediately")
    private boolean showResultsImmediately = true;
    
    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Question> questions = new ArrayList<>();
    
    // Business Rules:
    // - Question order randomization per attempt
    // - Time limit enforcement
    // - Anti-cheating measures
}
```

### 5. 🚀 Функціональність та інтеграції

#### Identity & Access Management (IAM)
```yaml
Authentication:
  - OAuth 2.1 + OpenID Connect
  - JWT tokens (24h access, 30d refresh)
  - Multi-factor authentication (TOTP)
  - Social logins (Google, Microsoft)
  - LDAP/SAML integration ready

Authorization:
  - RBAC з 4 основними ролями
  - Fine-grained permissions (45+ actions)
  - Resource-level access control
  - Temporary role elevation
  - Audit trail для всіх дій

Security Policies:
  - Password complexity enforcement
  - Account lockout after failed attempts
  - Session management (concurrent limits)
  - IP whitelist/blacklist support
```

#### Enterprise Security Framework
```java
// Zero Trust Security Model
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(
    prePostEnabled = true,
    securedEnabled = true,
    jsr250Enabled = true
)
public class SecurityConfig {
    
    // Multi-layer security validation
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        return http
            .sessionManagement(session -> 
                session.sessionCreationPolicy(STATELESS)
                       .maximumSessions(3)
                       .sessionRegistry(sessionRegistry()))
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthConverter())
                    .jwtDecoder(jwtDecoder())))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("SUPERADMIN")
                .requestMatchers("/api/teacher/**").hasAnyRole("TEACHER", "SUPERADMIN")
                .anyRequest().authenticated())
            .headers(headers -> headers
                .contentSecurityPolicy("default-src 'self'; script-src 'self' 'nonce-{nonce}'")
                .and()
                .httpStrictTransportSecurity(hstsConfig())
                .frameOptions().deny())
            .build();
    }
}

// Advanced Rate Limiting
@Component
public class AdvancedRateLimiter {
    // Sliding window rate limiting
    // Burst protection
    // User-based vs IP-based limits
    // Rate limit escalation
    // Whitelist/blacklist support
}
```

#### File Management & Storage
```java
// Multi-provider file storage strategy
@Service
public class FileStorageService {
    
    // Storage providers
    - Local filesystem (development)
    - AWS S3 (production)
    - MinIO cluster (private cloud)
    - Azure Blob Storage
    - Google Cloud Storage
    
    // Features
    - Virus scanning integration
    - File type validation (MIME + content)
    - Automatic thumbnails generation
    - CDN integration (CloudFront)
    - Backup and versioning
    - Encryption at rest + in transit
    
    // Business rules
    - Max file size per role
    - Quota management per user/course
    - File retention policies
    - GDPR compliance (data deletion)
}
```

#### Communication & Notifications
```java
// Multi-channel notification system
@Service
public class NotificationService {
    
    // Channels
    - Email (SMTP/SendGrid/AWS SES)
    - SMS (Twilio/AWS SNS)
    - Push notifications (Firebase)
    - In-app notifications
    - Slack/Teams integration
    
    // Features
    - Template engine (Thymeleaf)
    - Personalization and i18n
    - Delivery status tracking
    - Retry mechanisms with backoff
    - Unsubscribe management
    - Digest notifications (daily/weekly)
    
    // Triggers
    - Course enrollment/unenrollment
    - Assignment due dates
    - Grade posting
    - System maintenance
    - Security alerts
}
```

#### Analytics & Reporting
```java
// Business Intelligence Platform
@Service
public class AnalyticsService {
    
    // Data Collection
    - User interaction tracking
    - Learning path analysis
    - Performance metrics
    - Resource usage statistics
    - System performance monitoring
    
    // Reporting Engine
    - Real-time dashboards
    - Scheduled reports
    - Custom report builder
    - Data export (Excel, PDF, CSV)
    - API access for external tools
    
    // Compliance Reporting
    - FERPA compliance reports
    - Accessibility usage reports
    - Security audit logs
    - Data processing logs (GDPR)
}
```

#### API Architecture & Documentation
```yaml
API Design:
  Style: RESTful + GraphQL (read operations)
  Versioning: Header-based (/api/v1/, /api/v2/)
  Documentation: OpenAPI 3.0 + Swagger UI
  
Authentication:
  - Bearer token (JWT)
  - API Keys (service-to-service)
  - OAuth 2.1 client credentials
  
Rate Limiting:
  - Per endpoint limits
  - User tier-based limits
  - Burst allowance
  - Rate limit headers

Error Handling:
  - RFC 7807 Problem Details
  - Consistent error codes
  - Internationalized messages
  - Stack trace filtering

Response Format:
  - JSON:API specification
  - HATEOAS links
  - Pagination metadata
  - ETags for caching

Endpoints Architecture:
/api/v1/
├── auth/          # Authentication & authorization
├── users/         # User management
├── courses/       # Course operations
├── assignments/   # Assessment management  
├── submissions/   # Submission handling
├── grades/        # Gradebook operations
├── notifications/ # Communication
├── analytics/     # Reporting & analytics
├── files/         # File management
└── admin/         # Administrative functions
```

### 4. API Endpoints

```
/api/auth/ - аутентифікація
/api/courses/ - управління курсами
/api/assessments/ - завдання та тести
/api/submissions/ - подачі робіт
/api/notifications/ - сповіщення
/api/analytics/ - аналітика
/api/gradebook/ - журнал оцінок
/api/core/ - системні функції
```

## 🏗️ Enterprise Spring Boot Migration Strategy

### 1. 📚 Comprehensive Technology Stack

#### Core Spring Framework Stack
```xml
<!-- Spring Boot 3.2.x - Java 21 LTS -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.2</version>
</parent>

<dependencies>
    <!-- Web & API -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>
    
    <!-- Data Access -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-cache</artifactId>
    </dependency>
    
    <!-- Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-client</artifactId>
    </dependency>
    
    <!-- Validation & Serialization -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
    
    <!-- Messaging & Events -->
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-amqp</artifactId>
    </dependency>
    
    <!-- Email & Communication -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-mail</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>
</dependencies>
```

#### Enterprise Extensions & Libraries
```xml
<!-- Database & Migrations -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>com.zaxxer</groupId>
    <artifactId>HikariCP</artifactId>
</dependency>

<!-- Security & JWT -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-oauth2-jose</artifactId>
</dependency>

<!-- Cloud & Storage -->
<dependency>
    <groupId>io.awspring.cloud</groupId>
    <artifactId>spring-cloud-aws-starter-s3</artifactId>
    <version>3.0.3</version>
</dependency>
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>8.5.7</version>
</dependency>

<!-- Monitoring & Observability -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>

<!-- API Documentation -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>

<!-- Utilities -->
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.5.5.Final</version>
</dependency>
<dependency>
    <groupId>org.apache.tika</groupId>
    <artifactId>tika-core</artifactId>
    <version>2.9.1</version>
</dependency>

<!-- Testing -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>kafka</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>com.github.tomakehurst</groupId>
    <artifactId>wiremock-jre8</artifactId>
    <scope>test</scope>
</dependency>
```

### 2. 🏛️ Enterprise Architecture Design

#### Microservices Architecture (Phase 2+)
```yaml
Service Decomposition:
  user-service:          # Identity & Access Management
    - User management
    - Authentication/Authorization  
    - Profile management
    - RBAC enforcement
    
  course-service:        # Academic Content
    - Course management
    - Module organization
    - Enrollment handling
    - Content versioning
    
  assessment-service:    # Assessment Engine
    - Assignment creation
    - Quiz management
    - Auto-grading
    - Rubric evaluation
    
  submission-service:    # Submission Processing
    - File handling
    - Plagiarism detection
    - Version control
    - Batch processing
    
  grade-service:         # Academic Records
    - Gradebook management
    - Grade calculations
    - Reporting
    - Export services
    
  notification-service:  # Communication Hub
    - Multi-channel messaging
    - Event processing
    - Template management
    - Delivery tracking
    
  analytics-service:     # Business Intelligence
    - Data aggregation
    - Report generation
    - Metrics collection
    - Dashboard APIs

Gateway Architecture:
  api-gateway:
    - Routing & load balancing
    - Authentication/Authorization
    - Rate limiting & throttling
    - Request/response transformation
    - Circuit breaker patterns
    - API versioning
```

#### Domain-Driven Design Structure
```java
// Bounded Context: User Management
src/main/java/com/university/lms/
├── user/                           # User Bounded Context
│   ├── domain/
│   │   ├── model/                  # Domain Entities
│   │   │   ├── User.java
│   │   │   ├── UserRole.java
│   │   │   └── UserProfile.java
│   │   ├── service/                # Domain Services
│   │   │   ├── UserRegistrationService.java
│   │   │   ├── PasswordPolicyService.java
│   │   │   └── RoleManagementService.java
│   │   ├── repository/             # Domain Repositories
│   │   │   ├── UserRepository.java
│   │   │   └── UserProfileRepository.java
│   │   └── event/                  # Domain Events
│   │       ├── UserRegisteredEvent.java
│   │       ├── UserActivatedEvent.java
│   │       └── RoleChangedEvent.java
│   ├── application/
│   │   ├── service/                # Application Services
│   │   │   ├── UserApplicationService.java
│   │   │   ├── UserQueryService.java
│   │   │   └── UserCommandService.java
│   │   ├── dto/                    # Data Transfer Objects
│   │   │   ├── UserDto.java
│   │   │   ├── CreateUserRequest.java
│   │   │   └── UpdateUserRequest.java
│   │   └── mapper/                 # Object Mapping
│   │       └── UserMapper.java
│   ├── infrastructure/
│   │   ├── persistence/            # Data Access
│   │   │   ├── entity/
│   │   │   │   ├── UserEntity.java
│   │   │   │   └── UserProfileEntity.java
│   │   │   ├── repository/
│   │   │   │   ├── JpaUserRepository.java
│   │   │   │   └── UserRepositoryImpl.java
│   │   │   └── config/
│   │   │       └── UserDataConfig.java
│   │   ├── external/               # External Integrations
│   │   │   ├── email/
│   │   │   ├── ldap/
│   │   │   └── oauth/
│   │   └── event/                  # Event Publishers/Handlers
│   │       ├── UserEventPublisher.java
│   │       └── UserEventHandler.java
│   └── web/
│       ├── controller/             # REST Controllers
│       │   ├── UserController.java
│       │   ├── AuthController.java
│       │   └── UserProfileController.java
│       ├── security/               # Security Configuration
│       │   ├── UserSecurityConfig.java
│       │   └── UserPermissionEvaluator.java
│       └── validation/             # Request Validation
│           ├── UserValidation.java
│           └── PasswordValidation.java

├── course/                         # Course Bounded Context
├── assessment/                     # Assessment Bounded Context
├── shared/                         # Shared Kernel
│   ├── domain/
│   │   ├── AggregateRoot.java
│   │   ├── DomainEvent.java
│   │   └── ValueObject.java
│   ├── infrastructure/
│   │   ├── event/
│   │   │   ├── EventPublisher.java
│   │   │   └── EventStore.java
│   │   ├── cache/
│   │   ├── security/
│   │   └── monitoring/
│   └── web/
│       ├── exception/
│       ├── response/
│       └── validation/
```

### 3. 🔐 Ключові компоненти та безпека

#### Enterprise Security Configuration
```java
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(
    prePostEnabled = true,
    securedEnabled = true,
    jsr250Enabled = true
)
@EnableConfigurationProperties({
    SecurityProperties.class,
    JwtProperties.class,
    CorsProperties.class
})
public class SecurityConfig {
    
    private final JwtAuthenticationEntryPoint jwtEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;
    private final UserDetailsService userDetailsService;
    private final RedisTemplate<String, String> redisTemplate;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/auth/**", "/api/public/**"))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .maximumSessions(5)
                .sessionRegistry(sessionRegistry())
                .and()
                .invalidSessionUrl("/api/auth/session-expired"))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(jwtEntryPoint)
                .accessDeniedHandler(jwtAccessDeniedHandler))
            .authorizeHttpRequests(authz -> authz
                // Public endpoints
                .requestMatchers("/api/auth/login", "/api/auth/register", 
                                "/api/auth/verify-email", "/api/auth/reset-password").permitAll()
                .requestMatchers("/api/docs/**", "/api/health/**").permitAll()
                
                // Admin-only endpoints
                .requestMatchers("/api/admin/**", "/actuator/**").hasRole("SUPERADMIN")
                
                // Teacher/Admin endpoints
                .requestMatchers(HttpMethod.POST, "/api/courses").hasAnyRole("TEACHER", "SUPERADMIN")
                .requestMatchers(HttpMethod.POST, "/api/assessments/**").hasAnyRole("TEACHER", "SUPERADMIN")
                
                // Any authenticated user
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtDecoder(jwtDecoder())
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())))
            .headers(headers -> headers
                .contentSecurityPolicy(buildCSP())
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000)
                    .includeSubdomains(true)
                    .preload(true))
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny))
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(rateLimitFilter(), JwtAuthenticationFilter.class)
            .build();
    }
    
    @Bean
    public JwtDecoder jwtDecoder() {
        SecretKeySpec secretKey = new SecretKeySpec(
            jwtProperties.getSecret().getBytes(), "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(secretKey)
            .jwtProcessorCustomizer(jwtProcessor -> {
                jwtProcessor.setJWSKeySelector(new JWSVerificationKeySelector<>(
                    JWSAlgorithm.HS256, 
                    new ImmutableSecret<>(secretKey)));
            })
            .cache(Duration.ofMinutes(5))
            .build();
    }
    
    @Bean
    public JwtEncoder jwtEncoder() {
        SecretKeySpec secretKey = new SecretKeySpec(
            jwtProperties.getSecret().getBytes(), "HmacSHA256");
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey));
    }
    
    private String buildCSP() {
        return "default-src 'self'; " +
               "script-src 'self' 'nonce-{nonce}' 'strict-dynamic'; " +
               "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
               "font-src 'self' https://fonts.gstatic.com; " +
               "img-src 'self' data: https:; " +
               "media-src 'self' https:; " +
               "connect-src 'self' https://api.render.com wss:; " +
               "frame-ancestors 'none'; " +
               "base-uri 'self'; " +
               "form-action 'self'; " +
               "upgrade-insecure-requests;";
    }
}

// Advanced JWT Authentication Filter
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final RedisTemplate<String, String> redisTemplate;
    private final AuditService auditService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String token = extractToken(request);
        
        if (token != null && jwtService.validateToken(token)) {
            // Check token blacklist
            if (isTokenBlacklisted(token)) {
                handleBlacklistedToken(request, response);
                return;
            }
            
            String username = jwtService.extractUsername(token);
            
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                if (jwtService.isTokenValid(token, userDetails)) {
                    // Check for concurrent session limits
                    if (!checkConcurrentSessions(username)) {
                        handleTooManySessions(request, response);
                        return;
                    }
                    
                    UsernamePasswordAuthenticationToken authToken = 
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    
                    // Update last activity
                    updateLastActivity(username, request);
                    
                    // Audit successful authentication
                    auditService.logAuthentication(username, request.getRemoteAddr(), true);
                }
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    private void updateLastActivity(String username, HttpServletRequest request) {
        String key = "user:activity:" + username;
        String value = Json.createObjectBuilder()
            .add("lastActivity", Instant.now().toString())
            .add("ipAddress", request.getRemoteAddr())
            .add("userAgent", request.getHeader("User-Agent"))
            .build().toString();
        
        redisTemplate.opsForValue().set(key, value, Duration.ofHours(24));
    }
}

// Rate Limiting Filter
@Component
public class AdvancedRateLimitFilter extends OncePerRequestFilter {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final RateLimitProperties rateLimitProperties;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String clientId = getClientIdentifier(request);
        String endpoint = getEndpointKey(request);
        
        RateLimitRule rule = getRateLimitRule(endpoint, request);
        
        if (!isAllowed(clientId, endpoint, rule)) {
            handleRateLimitExceeded(request, response, rule);
            return;
        }
        
        // Record request
        recordRequest(clientId, endpoint, rule);
        
        // Add rate limit headers
        addRateLimitHeaders(response, clientId, endpoint, rule);
        
        filterChain.doFilter(request, response);
    }
    
    private boolean isAllowed(String clientId, String endpoint, RateLimitRule rule) {
        String key = String.format("rate_limit:%s:%s", clientId, endpoint);
        String countStr = redisTemplate.opsForValue().get(key);
        
        int currentCount = countStr != null ? Integer.parseInt(countStr) : 0;
        
        return currentCount < rule.getLimit();
    }
    
    private void recordRequest(String clientId, String endpoint, RateLimitRule rule) {
        String key = String.format("rate_limit:%s:%s", clientId, endpoint);
        
        redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, Duration.ofSeconds(rule.getWindowSeconds()));
    }
    
    private String getClientIdentifier(HttpServletRequest request) {
        // Try to get user ID first, fall back to IP
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            UserDetails user = (UserDetails) auth.getPrincipal();
            return "user:" + user.getUsername();
        }
        
        return "ip:" + getClientIpAddress(request);
    }
}
```

#### Business Service Layer
```java
// User Management Service
@Service
@Transactional
@PreAuthorize("hasRole('SUPERADMIN') or hasRole('TEACHER')")
public class UserService {
    
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final EventPublisher eventPublisher;
    private final CacheManager cacheManager;
    
    @PostAuthorize("returnObject.email == authentication.name or hasRole('SUPERADMIN')")
    @Cacheable(value = "users", key = "#userId")
    public UserDto getUserById(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
            
        return userMapper.toDto(user);
    }
    
    @PreAuthorize("hasRole('SUPERADMIN') or hasRole('TEACHER')")
    public Page<UserDto> getUsersWithFilters(UserSearchCriteria criteria, Pageable pageable) {
        
        // Security: Teachers can only see users in their courses
        if (hasRole("TEACHER") && !hasRole("SUPERADMIN")) {
            criteria.setCourseIds(getCurrentUserCourseIds());
        }
        
        Specification<User> spec = UserSpecifications.withCriteria(criteria);
        Page<User> users = userRepository.findAll(spec, pageable);
        
        return users.map(userMapper::toDto);
    }
    
    @PreAuthorize("hasRole('SUPERADMIN')")
    public UserDto createUser(CreateUserRequest request) {
        // Validate business rules
        validateUserCreationRules(request);
        
        User user = User.builder()
            .email(request.getEmail())
            .displayName(request.getDisplayName())
            .role(request.getRole())
            .passwordHash(passwordEncoder.encode(generateTemporaryPassword()))
            .emailVerified(false)
            .isActive(true)
            .build();
            
        User savedUser = userRepository.save(user);
        
        // Clear cache
        cacheManager.getCache("users").evict(savedUser.getId());
        
        // Send welcome email with password reset link
        emailService.sendWelcomeEmail(savedUser);
        
        // Publish domain event
        eventPublisher.publishEvent(new UserCreatedEvent(savedUser.getId(), savedUser.getEmail()));
        
        // Audit log
        auditService.logUserCreation(getCurrentUserId(), savedUser.getId());
        
        return userMapper.toDto(savedUser);
    }
    
    @PreAuthorize("@userSecurityService.canModifyUser(#userId)")
    public UserDto updateUser(UUID userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
            
        User originalUser = user.clone(); // For audit trail
        
        // Apply updates
        userMapper.updateUserFromRequest(request, user);
        user.setUpdatedAt(LocalDateTime.now());
        
        User savedUser = userRepository.save(user);
        
        // Clear cache
        cacheManager.getCache("users").evict(userId);
        
        // Audit changes
        auditService.logUserModification(getCurrentUserId(), userId, originalUser, savedUser);
        
        // Publish event if role changed
        if (!originalUser.getRole().equals(savedUser.getRole())) {
            eventPublisher.publishEvent(new UserRoleChangedEvent(
                savedUser.getId(), originalUser.getRole(), savedUser.getRole()));
        }
        
        return userMapper.toDto(savedUser);
    }
    
    private void validateUserCreationRules(CreateUserRequest request) {
        // Email domain validation
        if (!isValidInstitutionalEmail(request.getEmail())) {
            throw new InvalidEmailDomainException("Email must be from institutional domain");
        }
        
        // Student ID format validation
        if (request.getStudentId() != null && !isValidStudentIdFormat(request.getStudentId())) {
            throw new InvalidStudentIdException("Invalid student ID format");
        }
        
        // Role assignment rules
        if (!canAssignRole(getCurrentUserRole(), request.getRole())) {
            throw new InsufficientPermissionException("Cannot assign role: " + request.getRole());
        }
    }
}

// Course Management Service
@Service
@Transactional
public class CourseService {
    
    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final CourseMapper courseMapper;
    private final EventPublisher eventPublisher;
    private final StorageService storageService;
    
    @PreAuthorize("hasRole('TEACHER') or hasRole('SUPERADMIN')")
    public CourseDto createCourse(CreateCourseRequest request) {
        // Validate course code uniqueness for academic year
        validateCourseCodeUniqueness(request.getCode(), request.getAcademicYear());
        
        Course course = Course.builder()
            .code(request.getCode())
            .titleUk(request.getTitleUk())
            .titleEn(request.getTitleEn())
            .descriptionUk(request.getDescriptionUk())
            .descriptionEn(request.getDescriptionEn())
            .owner(getCurrentUser())
            .academicYear(request.getAcademicYear())
            .maxStudents(request.getMaxStudents())
            .visibility(CourseVisibility.DRAFT)
            .build();
            
        Course savedCourse = courseRepository.save(course);
        
        // Auto-enroll creator as teacher
        courseMemberRepository.save(CourseMember.builder()
            .course(savedCourse)
            .user(getCurrentUser())
            .roleInCourse(CourseRole.TEACHER)
            .enrollmentStatus(EnrollmentStatus.ACTIVE)
            .build());
            
        // Create default storage folder
        storageService.createCourseFolder(savedCourse.getId());
        
        // Publish event
        eventPublisher.publishEvent(new CourseCreatedEvent(savedCourse.getId()));
        
        return courseMapper.toDto(savedCourse);
    }
    
    @PreAuthorize("@courseSecurityService.canModifyCourse(#courseId)")
    public CourseDto updateCourse(UUID courseId, UpdateCourseRequest request) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new CourseNotFoundException("Course not found: " + courseId));
            
        // Prevent modification of published courses in certain ways
        if (course.getStatus() == CourseStatus.PUBLISHED) {
            validatePublishedCourseUpdate(request);
        }
        
        courseMapper.updateCourseFromRequest(request, course);
        course.setUpdatedAt(LocalDateTime.now());
        
        Course savedCourse = courseRepository.save(course);
        
        return courseMapper.toDto(savedCourse);
    }
    
    @PreAuthorize("@courseSecurityService.canEnrollStudents(#courseId)")
    public EnrollmentResultDto enrollStudents(UUID courseId, EnrollStudentsRequest request) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new CourseNotFoundException("Course not found: " + courseId));
            
        // Check enrollment capacity
        long currentEnrollment = courseMemberRepository.countByCourseIdAndEnrollmentStatus(
            courseId, EnrollmentStatus.ACTIVE);
            
        if (course.getMaxStudents() != null && 
            currentEnrollment + request.getStudentEmails().size() > course.getMaxStudents()) {
            throw new EnrollmentCapacityExceededException("Course enrollment capacity exceeded");
        }
        
        List<EnrollmentResult> results = new ArrayList<>();
        
        for (String email : request.getStudentEmails()) {
            try {
                User student = userRepository.findByEmail(email)
                    .orElseThrow(() -> new UserNotFoundException("Student not found: " + email));
                    
                // Check if already enrolled
                if (courseMemberRepository.existsByCourseIdAndUserId(courseId, student.getId())) {
                    results.add(EnrollmentResult.alreadyEnrolled(email));
                    continue;
                }
                
                CourseMember member = CourseMember.builder()
                    .course(course)
                    .user(student)
                    .roleInCourse(CourseRole.STUDENT)
                    .enrollmentStatus(EnrollmentStatus.ACTIVE)
                    .addedBy(getCurrentUser())
                    .build();
                    
                courseMemberRepository.save(member);
                
                // Send enrollment notification
                eventPublisher.publishEvent(new StudentEnrolledEvent(courseId, student.getId()));
                
                results.add(EnrollmentResult.success(email));
                
            } catch (Exception e) {
                results.add(EnrollmentResult.failed(email, e.getMessage()));
            }
        }
        
        return EnrollmentResultDto.builder()
            .totalRequested(request.getStudentEmails().size())
            .successful(results.stream().mapToInt(r -> r.isSuccess() ? 1 : 0).sum())
            .results(results)
            .build();
    }
}
```

### 4. 🗄️ Стратегія міграції даних та integrity

#### Enterprise Migration Strategy
```yaml
Migration Approach: Blue-Green Deployment with Data Synchronization

Phase 1: Schema Preparation
  - Create Spring Boot schema parallel to Django
  - Implement bidirectional data sync
  - Validate data integrity constraints
  - Performance baseline establishment

Phase 2: Gradual Service Migration  
  - Start with read-only services
  - Implement circuit breaker patterns
  - Real-time data validation
  - Rollback mechanisms

Phase 3: Write Operation Migration
  - Dual-write pattern implementation
  - Conflict resolution strategies
  - Audit trail maintenance
  - Data consistency validation

Phase 4: Cutover and Cleanup
  - DNS traffic switching
  - Django service decommission
  - Data cleanup and optimization
  - Performance validation
```

#### Comprehensive Flyway Migration Scripts
```sql
-- V001__Create_base_schema.sql
-- Users and Identity Management
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'TEACHER', 'TA', 'STUDENT');
CREATE TYPE user_locale AS ENUM ('uk', 'en');
CREATE TYPE user_theme AS ENUM ('light', 'dark');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(254) UNIQUE NOT NULL,
    display_name VARCHAR(150),
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    student_id VARCHAR(50) UNIQUE,
    role user_role NOT NULL DEFAULT 'STUDENT',
    locale user_locale NOT NULL DEFAULT 'uk',
    theme user_theme NOT NULL DEFAULT 'light',
    password_hash VARCHAR(128),
    avatar_url TEXT,
    bio TEXT,
    
    -- Security fields
    is_active BOOLEAN DEFAULT true,
    is_staff BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Preferences and metadata
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT users_student_id_check CHECK (student_id IS NULL OR student_id ~ '^[A-Z0-9]{6,12}$'),
    CONSTRAINT users_role_staff_check CHECK (
        (role IN ('SUPERADMIN', 'TEACHER') AND is_staff = true) OR 
        (role IN ('TA', 'STUDENT') AND is_staff = false)
    )
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_created_at ON users(created_at);

-- User profiles for extended information
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    department VARCHAR(200),
    position VARCHAR(200),
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- V002__Create_courses_schema.sql
CREATE TYPE course_visibility AS ENUM ('PUBLIC', 'PRIVATE', 'DRAFT');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE course_role AS ENUM ('TEACHER', 'TA', 'STUDENT');
CREATE TYPE enrollment_status AS ENUM ('active', 'dropped', 'completed');

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Multilingual content
    title_uk VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    description_uk TEXT,
    description_en TEXT,
    syllabus TEXT,
    
    -- Ownership and access
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE PROTECT,
    visibility course_visibility DEFAULT 'DRAFT',
    status course_status DEFAULT 'draft',
    is_published BOOLEAN DEFAULT false,
    
    -- Media and resources
    thumbnail_url TEXT,
    
    -- Academic metadata
    academic_year VARCHAR(20),
    department_id UUID,
    start_date DATE,
    end_date DATE,
    max_students INTEGER CHECK (max_students > 0 AND max_students <= 1000),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT courses_code_format CHECK (code ~ '^[A-Z]{2,4}[0-9]{3,4}$'),
    CONSTRAINT courses_academic_year_format CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    CONSTRAINT courses_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Course membership association
CREATE TABLE course_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_course course_role NOT NULL,
    enrollment_status enrollment_status DEFAULT 'active',
    
    -- Metadata
    added_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    final_grade DECIMAL(5,2) CHECK (final_grade >= 0 AND final_grade <= 100),
    completion_date TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(course_id, user_id)
);

-- V003__Create_assessments_schema.sql
CREATE TYPE assignment_type AS ENUM ('QUIZ', 'FILE_UPLOAD', 'TEXT', 'CODE', 'URL', 'MANUAL_GRADE', 'EXTERNAL');
CREATE TYPE content_format AS ENUM ('PLAIN', 'MARKDOWN', 'HTML', 'RICH');
CREATE TYPE question_type AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'CODE');

-- Course modules for organization
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    
    -- Scheduling
    available_from TIMESTAMP WITH TIME ZONE,
    available_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gradebook categories for weighted grading
CREATE TABLE gradebook_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    weight DECIMAL(5,2) CHECK (weight >= 0 AND weight <= 100),
    drop_lowest INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(course_id, name)
);

-- Main assignments table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    category_id UUID REFERENCES gradebook_categories(id) ON DELETE SET NULL,
    
    -- Basic info
    assignment_type assignment_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    description_format content_format DEFAULT 'MARKDOWN',
    instructions TEXT,
    instructions_format content_format DEFAULT 'MARKDOWN',
    
    -- Grading
    max_points DECIMAL(6,2) DEFAULT 100.00 CHECK (max_points > 0),
    position INTEGER DEFAULT 0,
    
    -- Scheduling
    available_from TIMESTAMP WITH TIME ZONE,
    available_until TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    allow_late_submission BOOLEAN DEFAULT false,
    late_penalty_percent DECIMAL(5,2) DEFAULT 0 CHECK (late_penalty_percent >= 0 AND late_penalty_percent <= 100),
    grade_anonymously BOOLEAN DEFAULT false,
    peer_review_enabled BOOLEAN DEFAULT false,
    peer_reviews_required INTEGER DEFAULT 0,
    
    -- File upload settings
    allowed_file_types JSONB DEFAULT '[]',
    max_file_size INTEGER DEFAULT 10485760 CHECK (max_file_size > 0), -- 10MB
    max_files INTEGER DEFAULT 5 CHECK (max_files > 0),
    
    -- Code assignment settings
    programming_language VARCHAR(50),
    auto_grading_enabled BOOLEAN DEFAULT false,
    starter_code TEXT,
    solution_code TEXT, -- instructor only
    test_cases JSONB DEFAULT '[]',
    
    -- External tool integration
    external_tool_url TEXT,
    external_tool_config JSONB DEFAULT '{}',
    
    -- Resources and metadata
    resources JSONB DEFAULT '[]',
    rubric JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    
    -- Publishing
    is_published BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT assignments_dates_check CHECK (
        (available_from IS NULL OR available_until IS NULL OR available_from <= available_until) AND
        (available_from IS NULL OR due_date IS NULL OR available_from <= due_date)
    )
);

-- Quiz-specific table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
    
    -- Quiz settings
    time_limit_minutes INTEGER CHECK (time_limit_minutes > 0 AND time_limit_minutes <= 300),
    max_attempts INTEGER DEFAULT 1 CHECK (max_attempts > 0),
    randomize_questions BOOLEAN DEFAULT false,
    randomize_answers BOOLEAN DEFAULT false,
    show_results_immediately BOOLEAN DEFAULT true,
    allow_backtrack BOOLEAN DEFAULT true,
    
    -- Security settings
    require_lockdown_browser BOOLEAN DEFAULT false,
    ip_restrictions JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Data Migration and Validation Scripts
```java
@Service
@Transactional
public class DataMigrationService {
    
    private final EntityManager entityManager;
    private final DataIntegrityValidator dataIntegrityValidator;
    private final MigrationAuditService migrationAuditService;
    
    @Async
    public CompletableFuture<MigrationResult> migrateUsersFromDjango() {
        
        try (Connection djangoConnection = getDjangoConnection()) {
            
            String djangoQuery = """
                SELECT id, email, display_name, first_name, last_name, student_id,
                       role, locale, theme, password, avatar, bio, is_active, 
                       email_verified, preferences, created_at, updated_at
                FROM users_user 
                WHERE created_at >= ? 
                ORDER BY created_at
                """;
                
            PreparedStatement stmt = djangoConnection.prepareStatement(djangoQuery);
            stmt.setTimestamp(1, getLastMigrationTimestamp());
            
            ResultSet rs = stmt.executeQuery();
            
            int processed = 0, success = 0, failed = 0;
            List<String> errors = new ArrayList<>();
            
            while (rs.next()) {
                try {
                    UserEntity user = mapDjangoUserToSpring(rs);
                    
                    // Validate data integrity
                    dataIntegrityValidator.validateUser(user);
                    
                    // Check for duplicates
                    if (!userExists(user.getEmail())) {
                        entityManager.persist(user);
                        success++;
                    } else {
                        // Handle update scenario
                        updateExistingUser(user);
                        success++;
                    }
                    
                    if (processed % 100 == 0) {
                        entityManager.flush();
                        entityManager.clear();
                    }
                    
                } catch (Exception e) {
                    failed++;
                    errors.add(String.format("Row %d: %s", processed, e.getMessage()));
                    log.error("Failed to migrate user at row {}", processed, e);
                }
                
                processed++;
            }
            
            // Final validation
            MigrationResult result = MigrationResult.builder()
                .entityType("User")
                .totalProcessed(processed)
                .successful(success)
                .failed(failed)
                .errors(errors)
                .duration(Duration.between(startTime, Instant.now()))
                .build();
                
            migrationAuditService.logMigrationResult(result);
            
            return CompletableFuture.completedFuture(result);
            
        } catch (SQLException e) {
            throw new MigrationException("Failed to migrate users", e);
        }
    }
    
    private UserEntity mapDjangoUserToSpring(ResultSet rs) throws SQLException {
        return UserEntity.builder()
            .id(UUID.fromString(rs.getString("id")))
            .email(rs.getString("email"))
            .displayName(rs.getString("display_name"))
            .firstName(rs.getString("first_name"))
            .lastName(rs.getString("last_name"))
            .studentId(rs.getString("student_id"))
            .role(UserRole.valueOf(rs.getString("role")))
            .locale(UserLocale.valueOf(rs.getString("locale")))
            .theme(UserTheme.valueOf(rs.getString("theme")))
            .passwordHash(rs.getString("password"))
            .avatarUrl(rs.getString("avatar"))
            .bio(rs.getString("bio"))
            .isActive(rs.getBoolean("is_active"))
            .emailVerified(rs.getBoolean("email_verified"))
            .preferences(parseJsonToMap(rs.getString("preferences")))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .updatedAt(rs.getTimestamp("updated_at").toLocalDateTime())
            .build();
    }
}

@Component
public class DataIntegrityValidator {
    
    public void validateUser(UserEntity user) {
        List<String> violations = new ArrayList<>();
        
        // Email validation
        if (!isValidEmail(user.getEmail())) {
            violations.add("Invalid email format: " + user.getEmail());
        }
        
        // Institutional email requirement
        if (!isInstitutionalEmail(user.getEmail())) {
            violations.add("Email must be from institutional domain: " + user.getEmail());
        }
        
        // Student ID format validation
        if (user.getStudentId() != null && !isValidStudentIdFormat(user.getStudentId())) {
            violations.add("Invalid student ID format: " + user.getStudentId());
        }
        
        // Role consistency validation
        if (!isValidRoleAssignment(user.getRole(), user.isStaff())) {
            violations.add("Inconsistent role and staff status");
        }
        
        // Password hash validation
        if (user.getPasswordHash() != null && !isValidPasswordHash(user.getPasswordHash())) {
            violations.add("Invalid password hash format");
        }
        
        if (!violations.isEmpty()) {
            throw new DataIntegrityViolationException(
                "User validation failed: " + String.join(", ", violations));
        }
    }
    
    public void validateCourse(CourseEntity course) {
        List<String> violations = new ArrayList<>();
        
        // Course code validation
        if (!isValidCourseCode(course.getCode())) {
            violations.add("Invalid course code format: " + course.getCode());
        }
        
        // Academic year validation
        if (!isValidAcademicYear(course.getAcademicYear())) {
            violations.add("Invalid academic year format: " + course.getAcademicYear());
        }
        
        // Date consistency validation
        if (course.getStartDate() != null && course.getEndDate() != null &&
            course.getEndDate().isBefore(course.getStartDate())) {
            violations.add("End date cannot be before start date");
        }
        
        // Capacity validation
        if (course.getMaxStudents() != null && course.getMaxStudents() <= 0) {
            violations.add("Max students must be positive");
        }
        
        if (!violations.isEmpty()) {
            throw new DataIntegrityViolationException(
                "Course validation failed: " + String.join(", ", violations));
        }
    }
}

@Service
public class DataSynchronizationService {
    
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    
    @EventListener
    public void handleUserCreated(UserCreatedEvent event) {
        // Synchronize to Django during migration period
        if (isMigrationPhase()) {
            syncUserToDjango(event.getUserId());
        }
        
        // Publish to event stream
        kafkaTemplate.send("user.events", "user.created", event);
        
        // Update cache
        invalidateUserCache(event.getUserId());
    }
    
    @EventListener
    public void handleUserUpdated(UserUpdatedEvent event) {
        if (isMigrationPhase()) {
            syncUserToDjango(event.getUserId());
        }
        
        kafkaTemplate.send("user.events", "user.updated", event);
        invalidateUserCache(event.getUserId());
    }
    
    @Retryable(value = {Exception.class}, maxAttempts = 3)
    private void syncUserToDjango(UUID userId) {
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
            
        // Convert to Django format
        DjangoUserDto djangoUser = mapSpringUserToDjango(user);
        
        // HTTP call to Django sync endpoint
        restTemplate.postForObject(
            djangoSyncProperties.getUserSyncUrl(),
            djangoUser,
            String.class
        );
    }
}
```

### 5. 🧪 Comprehensive Testing Strategy

#### Test Architecture and Categories
```yaml
Testing Pyramid:
  Unit Tests (70%):
    - Domain logic validation
    - Business rule enforcement
    - Security policy verification
    - Data transformation accuracy
    
  Integration Tests (20%):
    - Database transactions
    - External service integration
    - Message broker communication
    - File storage operations
    
  End-to-End Tests (10%):
    - Complete user workflows
    - Cross-service communication
    - Performance under load
    - Security vulnerability assessment

Test Environments:
  - Local Development (TestContainers)
  - CI/CD Pipeline (Docker Compose)
  - Staging (Production-like environment)
  - Performance Testing (Load testing environment)
```

#### Security Testing Framework
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(OrderAnnotation.class)
@DisplayName("Security Integration Tests")
class SecurityIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JwtService jwtService;
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("lms_test")
            .withUsername("test")
            .withPassword("test");
    
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);
            
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }
    
    @Test
    @Order(1)
    @DisplayName("Authentication - Valid credentials should return JWT tokens")
    void testValidAuthentication() {
        // Given
        User testUser = createTestUser("test@ucu.edu.ua", "ValidPass123!");
        userRepository.save(testUser);
        
        LoginRequest loginRequest = LoginRequest.builder()
            .email("test@ucu.edu.ua")
            .password("ValidPass123!")
            .build();
        
        // When
        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
            "/api/auth/login", loginRequest, AuthResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getAccessToken()).isNotBlank();
        assertThat(response.getBody().getRefreshToken()).isNotBlank();
        
        // Verify JWT structure and claims
        String accessToken = response.getBody().getAccessToken();
        assertThat(jwtService.validateToken(accessToken)).isTrue();
        assertThat(jwtService.extractUsername(accessToken)).isEqualTo("test@ucu.edu.ua");
    }
    
    @Test
    @DisplayName("Authentication - Invalid credentials should return 401")
    void testInvalidAuthentication() {
        LoginRequest loginRequest = LoginRequest.builder()
            .email("test@ucu.edu.ua")
            .password("WrongPassword")
            .build();
        
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/auth/login", loginRequest, ErrorResponse.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().getCode()).isEqualTo("INVALID_CREDENTIALS");
    }
    
    @Test
    @DisplayName("Rate Limiting - Should block excessive requests")
    void testRateLimiting() {
        LoginRequest loginRequest = LoginRequest.builder()
            .email("test@ucu.edu.ua")
            .password("WrongPassword")
            .build();
        
        // Make requests up to the limit
        for (int i = 0; i < 20; i++) {
            ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
                "/api/auth/login", loginRequest, ErrorResponse.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
        
        // Next request should be rate limited
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/auth/login", loginRequest, ErrorResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }
    
    @Test
    @DisplayName("Authorization - Role-based access control")
    void testRoleBasedAccess() {
        // Given
        User student = createTestUser("student@ucu.edu.ua", "Pass123!", UserRole.STUDENT);
        User teacher = createTestUser("teacher@ucu.edu.ua", "Pass123!", UserRole.TEACHER);
        userRepository.saveAll(List.of(student, teacher));
        
        String studentToken = jwtService.generateToken(student);
        String teacherToken = jwtService.generateToken(teacher);
        
        HttpHeaders studentHeaders = new HttpHeaders();
        studentHeaders.setBearerAuth(studentToken);
        
        HttpHeaders teacherHeaders = new HttpHeaders();
        teacherHeaders.setBearerAuth(teacherToken);
        
        // When & Then - Student cannot create courses
        ResponseEntity<ErrorResponse> studentResponse = restTemplate.exchange(
            "/api/courses", HttpMethod.POST, 
            new HttpEntity<>(createCourseRequest(), studentHeaders), 
            ErrorResponse.class);
        assertThat(studentResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        
        // Teacher can create courses
        ResponseEntity<CourseDto> teacherResponse = restTemplate.exchange(
            "/api/courses", HttpMethod.POST, 
            new HttpEntity<>(createCourseRequest(), teacherHeaders), 
            CourseDto.class);
        assertThat(teacherResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
    
    @Test
    @DisplayName("Input Validation - SQL Injection prevention")
    void testSqlInjectionPrevention() {
        String maliciousEmail = "test'; DROP TABLE users; --";
        
        LoginRequest loginRequest = LoginRequest.builder()
            .email(maliciousEmail)
            .password("password")
            .build();
        
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/auth/login", loginRequest, ErrorResponse.class);
        
        // Should return validation error, not cause database issues
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        
        // Verify users table still exists
        assertThat(userRepository.count()).isGreaterThanOrEqualTo(0);
    }
    
    @Test
    @DisplayName("Security Headers - CSP and security headers present")
    void testSecurityHeaders() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/health", String.class);
        
        HttpHeaders headers = response.getHeaders();
        
        // Content Security Policy
        assertThat(headers.getFirst("Content-Security-Policy")).contains("default-src 'self'");
        
        // HSTS
        assertThat(headers.getFirst("Strict-Transport-Security"))
            .contains("max-age=31536000");
        
        // XSS Protection
        assertThat(headers.getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(headers.getFirst("X-Frame-Options")).isEqualTo("DENY");
    }
}

// Performance Testing
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("Performance Integration Tests")
class PerformanceIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @DisplayName("Load Test - User authentication under load")
    @Timeout(value = 30, unit = TimeUnit.SECONDS)
    void testAuthenticationPerformance() throws InterruptedException {
        int numberOfThreads = 50;
        int requestsPerThread = 20;
        
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        LoginRequest request = LoginRequest.builder()
                            .email("perf-test-user-" + Thread.currentThread().getId() + "@ucu.edu.ua")
                            .password("TestPass123!")
                            .build();
                        
                        try {
                            ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                                "/api/auth/login", request, AuthResponse.class);
                            
                            if (response.getStatusCode().is2xxSuccessful()) {
                                successCount.incrementAndGet();
                            } else {
                                errorCount.incrementAndGet();
                            }
                        } catch (Exception e) {
                            errorCount.incrementAndGet();
                        }
                    }
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
        executor.shutdown();
        
        long endTime = System.currentTimeMillis();
        long totalTime = endTime - startTime;
        int totalRequests = numberOfThreads * requestsPerThread;
        double requestsPerSecond = (totalRequests * 1000.0) / totalTime;
        
        System.out.printf("Performance Results:%n" +
                         "Total Requests: %d%n" +
                         "Successful: %d%n" +
                         "Errors: %d%n" +
                         "Total Time: %d ms%n" +
                         "Requests/Second: %.2f%n",
                         totalRequests, successCount.get(), errorCount.get(), totalTime, requestsPerSecond);
        
        // Assertions
        assertThat(requestsPerSecond).isGreaterThan(100); // Minimum 100 RPS
        assertThat(errorCount.get()).isLessThan(totalRequests * 0.05); // Less than 5% errors
    }
    
    @Test
    @DisplayName("Database Performance - Complex query performance")
    void testDatabaseQueryPerformance() {
        // Test complex queries with large datasets
        StopWatch stopWatch = new StopWatch();
        
        stopWatch.start("User search with filters");
        ResponseEntity<PagedResponse<UserDto>> response = restTemplate.exchange(
            "/api/users?page=0&size=20&role=STUDENT&sort=createdAt,desc",
            HttpMethod.GET,
            createAuthenticatedRequest(),
            new ParameterizedTypeReference<PagedResponse<UserDto>>() {});
        stopWatch.stop();
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(stopWatch.getLastTaskTimeMillis()).isLessThan(1000); // Under 1 second
    }
}

// Data Migration Testing
@SpringBootTest
@DisplayName("Data Migration Tests")
class DataMigrationTest {
    
    @Autowired
    private DataMigrationService migrationService;
    
    @Autowired
    private DataIntegrityValidator dataValidator;
    
    @Test
    @DisplayName("User Migration - Data integrity validation")
    void testUserDataMigration() {
        // Given - Sample Django user data
        DjangoUserData djangoUser = DjangoUserData.builder()
            .id(UUID.randomUUID())
            .email("test@ucu.edu.ua")
            .displayName("Test User")
            .role("STUDENT")
            .preferences("{\"theme\": \"dark\", \"locale\": \"uk\"}")
            .createdAt(LocalDateTime.now())
            .build();
        
        // When
        UserEntity springUser = migrationService.convertDjangoUser(djangoUser);
        
        // Then
        assertDoesNotThrow(() -> dataValidator.validateUser(springUser));
        assertThat(springUser.getEmail()).isEqualTo(djangoUser.getEmail());
        assertThat(springUser.getRole()).isEqualTo(UserRole.STUDENT);
        assertThat(springUser.getPreferences()).containsEntry("theme", "dark");
    }
    
    @Test
    @DisplayName("Course Migration - Relationship preservation")
    void testCourseMigrationWithRelationships() {
        // Test that course-user relationships are preserved during migration
        // Test that course modules and assignments are correctly linked
        // Test that gradebook categories maintain their associations
    }
}

// API Contract Testing
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("API Contract Tests")
class ApiContractTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @DisplayName("API Versioning - Backward compatibility")
    void testApiVersioning() {
        // Test that v1 API still works when v2 is introduced
        ResponseEntity<String> v1Response = restTemplate.getForEntity("/api/v1/health", String.class);
        ResponseEntity<String> v2Response = restTemplate.getForEntity("/api/v2/health", String.class);
        
        assertThat(v1Response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(v2Response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
    
    @Test
    @DisplayName("Error Responses - RFC 7807 compliance")
    void testErrorResponseFormat() {
        ResponseEntity<ErrorResponse> response = restTemplate.getForEntity(
            "/api/users/non-existent-id", ErrorResponse.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        
        ErrorResponse error = response.getBody();
        assertThat(error).isNotNull();
        assertThat(error.getType()).isNotBlank();
        assertThat(error.getTitle()).isNotBlank();
        assertThat(error.getStatus()).isEqualTo(404);
        assertThat(error.getDetail()).isNotBlank();
        assertThat(error.getInstance()).isNotBlank();
    }
}
```

#### Automated Testing Pipeline
```yaml
# .github/workflows/test-pipeline.yml
name: Comprehensive Test Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Cache Maven dependencies
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
      
      - name: Run unit tests
        run: ./mvnw test -Dtest="*UnitTest"
      
      - name: Generate test report
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Unit Tests
          path: target/surefire-reports/*.xml
          reporter: java-junit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: lms_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Run integration tests
        run: ./mvnw test -Dtest="*IntegrationTest"
        env:
          SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/lms_test
          SPRING_DATASOURCE_USERNAME: postgres
          SPRING_DATASOURCE_PASSWORD: testpass
          SPRING_REDIS_HOST: localhost
          SPRING_REDIS_PORT: 6379

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Run OWASP dependency check
        run: ./mvnw org.owasp:dependency-check-maven:check
      
      - name: Run security tests
        run: ./mvnw test -Dtest="*SecurityTest"
      
      - name: SonarQube scan
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: ./mvnw sonar:sonar

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Start application
        run: ./mvnw spring-boot:run &
        env:
          SPRING_PROFILES_ACTIVE: test
      
      - name: Wait for application
        run: sleep 60
      
      - name: Run JMeter performance tests
        run: |
          wget https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.2.zip
          unzip -q apache-jmeter-5.6.2.zip
          ./apache-jmeter-5.6.2/bin/jmeter -n -t performance-tests/load-test.jmx -l results.jtl
      
      - name: Analyze results
        run: python scripts/analyze_performance.py results.jtl
```

### 7. 🚀 Enterprise Configuration and DevOps

#### Production-Ready Configuration
```yaml
# application-prod.yml - Production Configuration
spring:
  application:
    name: university-lms-api
    
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://postgres-cluster:5432/lms_prod}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 30000
      validation-timeout: 5000
      leak-detection-threshold: 60000
      
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false
        jdbc:
          batch_size: 25
        order_inserts: true
        order_updates: true
        generate_statistics: false
    show-sql: false
    
  cache:
    type: redis
    redis:
      cache-null-values: false
      time-to-live: 300000 # 5 minutes
      use-key-prefix: true
      key-prefix: "lms:cache:"
      
  data:
    redis:
      cluster:
        nodes: 
          - redis-cluster-1:6379
          - redis-cluster-2:6379
          - redis-cluster-3:6379
        max-redirects: 3
      timeout: 5000ms
      lettuce:
        pool:
          max-active: 20
          max-idle: 8
          min-idle: 0
          
  kafka:
    bootstrap-servers: 
      - kafka-1:9092
      - kafka-2:9092
      - kafka-3:9092
    producer:
      acks: all
      retries: 3
      batch-size: 16384
      linger-ms: 5
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
    consumer:
      group-id: lms-api-group
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${JWT_ISSUER_URI:https://auth.university.edu}
          jwk-set-uri: ${JWT_JWK_SET_URI:https://auth.university.edu/.well-known/jwks.json}
          
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus,info,env,beans,configprops
      base-path: /actuator
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
    metrics:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: university-lms
      environment: production
    distribution:
      percentiles-histogram:
        http.server.requests: true
      slo:
        http.server.requests: 100ms,200ms,500ms,1s,2s
        
  tracing:
    sampling:
      probability: 0.1
  zipkin:
    tracing:
      endpoint: ${ZIPKIN_URL:http://zipkin:9411/api/v2/spans}

server:
  port: 8080
  servlet:
    context-path: /api
  compression:
    enabled: true
    mime-types: application/json,application/xml,text/html,text/xml,text/plain
  http2:
    enabled: true
  ssl:
    enabled: ${SSL_ENABLED:true}
    key-store: ${SSL_KEYSTORE_PATH:/etc/ssl/keystore.p12}
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    key-store-type: PKCS12
    
logging:
  level:
    com.university.lms: ${LOG_LEVEL:INFO}
    org.springframework.security: WARN
    org.hibernate.SQL: WARN
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level [%X{traceId:-},%X{spanId:-}] %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level [%X{traceId:-},%X{spanId:-}] %logger{36} - %msg%n"
  file:
    name: /var/log/lms/application.log
    max-size: 10MB
    max-history: 30
```

#### Kubernetes Deployment Configuration
```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lms-api
  namespace: university-lms
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: lms-api
  template:
    metadata:
      labels:
        app: lms-api
    spec:
      containers:
      - name: lms-api
        image: university/lms-api:${IMAGE_TAG}
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
```

#### Infrastructure as Code (Terraform)
```hcl
# terraform/main.tf
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = "university-lms"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_groups = {
    general = {
      min_size     = 3
      max_size     = 10
      desired_size = 3
      instance_types = ["t3.large"]
    }
  }
}
```

### 8. DevOps та Infrastructure

#### Dockerfile для Spring Boot
```dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app

COPY target/lms-api-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### Docker Compose оновлення
```yaml
services:
  backend-spring:
    build: ./backend-spring
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=jdbc:postgresql://db:5432/lms_db
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis
      
  backend-django:  # Поки тримаємо для поступової міграції
    build: ./backend
    ports:
      - "8000:8000"
    # ... існуюча конфігурація
```

## 📋 Enterprise Migration Implementation Plan

### Phase-by-Phase Migration Strategy

#### 🎯 Phase 0: Foundation & Preparation (4-6 тижнів)
```yaml
Infrastructure Setup:
  Week 1-2:
    - AWS/Cloud infrastructure provisioning (Terraform)
    - Kubernetes cluster setup (EKS/GKE)
    - CI/CD pipeline configuration (GitOps)
    - Monitoring stack deployment (Prometheus, Grafana)
    - Secret management setup (Vault/AWS Secrets Manager)
  
  Week 3-4:
    - Database cluster setup (PostgreSQL 15 + read replicas)
    - Redis cluster configuration
    - Message broker setup (Kafka/RabbitMQ)
    - File storage configuration (S3/MinIO)
    - SSL certificates and security hardening
    
  Week 5-6:
    - Security audit and penetration testing
    - Performance baseline establishment
    - Disaster recovery procedures
    - Team training on new technology stack
    - Documentation and runbooks creation

Technical Deliverables:
  ✅ Production-ready infrastructure
  ✅ Monitoring and alerting system
  ✅ Security framework implementation
  ✅ CI/CD pipeline with automated testing
  ✅ Data backup and recovery procedures
```

#### 🔧 Phase 1: Core Services Migration (6-8 тижнів)
```yaml
Identity & Access Management:
  Week 1-3:
    - User service implementation
    - Authentication service (OAuth 2.1 + JWT)
    - RBAC system with fine-grained permissions
    - Password policies and security controls
    - Multi-factor authentication setup
    
  Week 4-5:
    - Data migration scripts for users
    - API compatibility layer
    - Session management and concurrent login controls
    - Audit logging implementation
    
  Week 6-8:
    - Integration testing with frontend
    - Load testing and performance optimization
    - Security testing and vulnerability assessment
    - Production deployment with blue-green strategy

Success Criteria:
  ✅ Zero-downtime user authentication
  ✅ API response time < 100ms (95th percentile)
  ✅ 100% data integrity validation
  ✅ Security compliance verification
  ✅ Frontend compatibility maintained
```

#### 📚 Phase 2: Academic Core Services (8-10 тижнів)
```yaml
Course Management:
  Week 1-4:
    - Course service implementation
    - Module and content management
    - Enrollment system with capacity management
    - Multi-language content support
    - Course analytics and reporting
    
  Week 5-6:
    - Course data migration with relationship preservation
    - File migration and storage optimization
    - API gateway routing configuration
    - Cache strategy implementation
    
  Week 7-10:
    - Assessment service implementation
    - Quiz engine with anti-cheating measures
    - Auto-grading system for code assignments
    - Plagiarism detection integration
    - Comprehensive testing and optimization

Performance Targets:
  ✅ Course load time < 200ms
  ✅ File upload throughput > 50 MB/s
  ✅ Concurrent user support: 10,000+
  ✅ Cache hit ratio > 85%
  ✅ Zero data loss during migration
```

#### 📊 Phase 3: Assessment & Grading Engine (6-8 тижнів)
```yaml
Submission Management:
  Week 1-3:
    - Submission service with version control
    - File processing pipeline
    - Virus scanning and content validation
    - Batch processing for large submissions
    
  Week 4-5:
    - Gradebook service implementation
    - Grade calculation engine with weighted categories
    - Grade distribution analytics
    - Export functionality (Excel, CSV, PDF)
    
  Week 6-8:
    - Peer review system
    - Rubric-based grading
    - Grade appeals workflow
    - Parent/guardian portal integration
    - Advanced analytics and insights

Quality Metrics:
  ✅ File processing speed: < 5 seconds per 10MB
  ✅ Grade calculation accuracy: 100%
  ✅ Concurrent submissions: 1,000+
  ✅ Data export speed: < 30 seconds for 10,000 records
```

#### 🔔 Phase 4: Communication & Analytics (4-6 тижнів)
```yaml
Notification System:
  Week 1-2:
    - Multi-channel notification service
    - Template engine implementation
    - Delivery tracking and retry mechanisms
    - Unsubscribe and preference management
    
  Week 3-4:
    - Analytics service implementation
    - Real-time dashboard development
    - Custom report builder
    - Business intelligence integration
    
  Week 5-6:
    - Advanced analytics (learning patterns, predictions)
    - Compliance reporting (FERPA, GDPR)
    - Performance optimization
    - Final integration testing

Scalability Targets:
  ✅ Email delivery: 100,000+ per hour
  ✅ Real-time analytics: < 1 second latency
  ✅ Custom reports: < 5 minutes generation
  ✅ Dashboard load time: < 2 seconds
```

#### ✅ Phase 5: Production Cutover & Optimization (3-4 тижні)
```yaml
Cutover Preparation:
  Week 1:
    - Final data synchronization
    - DNS and load balancer configuration
    - Traffic splitting setup (blue-green)
    - Rollback procedures validation
    
  Week 2:
    - Production cutover execution
    - Real-time monitoring and alerting
    - Performance tuning and optimization
    - User acceptance testing
    
  Week 3-4:
    - Django service decommissioning
    - Data cleanup and optimization
    - Cost optimization and resource tuning
    - Documentation updates and knowledge transfer

Success Metrics:
  ✅ Cutover downtime: < 30 minutes
  ✅ Zero critical issues in first 48 hours
  ✅ Performance improvement: 30%+
  ✅ Cost reduction: 20%+
  ✅ User satisfaction: 95%+
```

### 🛡️ Comprehensive Risk Management

#### High-Priority Risks
```yaml
Data Loss/Corruption:
  Risk Level: CRITICAL
  Probability: LOW
  Impact: VERY HIGH
  Mitigation:
    - Automated backup verification
    - Real-time data synchronization
    - Point-in-time recovery capabilities
    - Checksums and integrity validation
    - Rollback procedures within 15 minutes
    
Performance Degradation:
  Risk Level: HIGH
  Probability: MEDIUM
  Impact: HIGH
  Mitigation:
    - Load testing with 3x expected traffic
    - Performance monitoring with alerting
    - Auto-scaling policies
    - CDN and edge caching
    - Circuit breaker patterns
    
Security Vulnerabilities:
  Risk Level: CRITICAL
  Probability: MEDIUM
  Impact: VERY HIGH
  Mitigation:
    - Security-first development practices
    - Automated security scanning (SAST/DAST)
    - Penetration testing by third-party
    - Zero-trust architecture
    - Incident response procedures
```

#### Medium-Priority Risks
```yaml
API Breaking Changes:
  Risk Level: MEDIUM
  Probability: MEDIUM
  Impact: MEDIUM
  Mitigation:
    - API versioning strategy
    - Backward compatibility testing
    - Contract testing with frontend
    - Gradual API migration
    - Feature flags for new endpoints
    
Team Knowledge Gap:
  Risk Level: MEDIUM
  Probability: HIGH
  Impact: MEDIUM
  Mitigation:
    - Comprehensive training program
    - Knowledge sharing sessions
    - Pair programming during migration
    - External Spring Boot experts consulting
    - Detailed documentation and runbooks
    
Third-Party Integration Issues:
  Risk Level: MEDIUM
  Probability: MEDIUM
  Impact: MEDIUM
  Mitigation:
    - Integration testing environment
    - Mock services for testing
    - Service mesh for resilience
    - Timeout and retry policies
    - Alternative provider evaluation
```

### 📈 Success Metrics & KPIs

#### Technical Metrics
```yaml
Performance:
  - API Response Time (95th percentile): < 200ms
  - Database Query Time: < 50ms average
  - File Upload Speed: > 50 MB/s
  - Cache Hit Ratio: > 85%
  - Error Rate: < 0.1%
  
Scalability:
  - Concurrent Users: 10,000+
  - Requests per Second: 5,000+
  - Database Connections: Efficient pooling
  - Memory Usage: < 80% of allocated
  - CPU Usage: < 70% under normal load
  
Reliability:
  - Uptime: 99.9%+
  - Mean Time To Recovery: < 5 minutes
  - Data Integrity: 100%
  - Backup Success Rate: 100%
  - Security Incidents: 0
```

#### Business Metrics
```yaml
User Experience:
  - Page Load Time: < 2 seconds
  - User Satisfaction Score: > 4.5/5
  - Feature Adoption Rate: > 80%
  - Support Ticket Reduction: 30%+
  
Operational Efficiency:
  - Deployment Time: < 15 minutes
  - Infrastructure Cost: 20% reduction
  - Development Velocity: 25% increase
  - Maintenance Effort: 40% reduction
  
Compliance & Security:
  - Security Audit Score: A+
  - GDPR Compliance: 100%
  - Data Breach Incidents: 0
  - Vulnerability Response Time: < 24 hours
```

### 💡 Strategic Recommendations

#### Technology Stack Optimization
```yaml
Java & Spring Ecosystem:
  - Use Java 21 LTS with Project Loom (Virtual Threads)
  - Implement Spring Boot 3.2+ with native compilation
  - Leverage Spring Cloud Gateway for API management
  - Use Spring Security 6+ for Zero Trust architecture
  - Implement Spring Cache with Redis for performance
  
Database & Storage:
  - PostgreSQL 15+ with read replicas for scaling
  - Connection pooling with HikariCP optimization
  - Database partitioning for large datasets
  - Redis Cluster for distributed caching
  - S3-compatible storage with CDN integration
  
Monitoring & Observability:
  - OpenTelemetry for distributed tracing
  - Prometheus + Grafana for metrics
  - ELK/EFK stack for centralized logging
  - APM tools (New Relic, DataDog) for insights
  - Synthetic monitoring for user experience
```

#### Operational Excellence
```yaml
DevOps Practices:
  - GitOps with ArgoCD for deployments
  - Infrastructure as Code with Terraform
  - Feature flags for controlled rollouts
  - Automated testing at all levels
  - Chaos engineering for resilience testing
  
Security & Compliance:
  - Zero Trust security model
  - Secrets management with Vault
  - Regular security audits and penetration testing
  - Automated compliance checking
  - Data encryption at rest and in transit
  
Team Development:
  - Spring Boot certification program
  - Regular architecture review sessions
  - Code quality gates with SonarQube
  - Performance engineering practices
  - Incident response training
```

### 🎯 Post-Migration Benefits

#### Technical Advantages
- **Performance**: 30-50% improvement in response times
- **Scalability**: Linear scaling with cloud-native architecture
- **Reliability**: 99.9%+ uptime with proper monitoring
- **Security**: Enterprise-grade security with Spring Security
- **Maintainability**: Better code organization and testing

#### Business Value
- **Cost Efficiency**: 20-30% reduction in infrastructure costs
- **Developer Productivity**: 25%+ increase in development velocity
- **Time to Market**: Faster feature delivery with Spring ecosystem
- **Risk Reduction**: Better error handling and monitoring
- **Compliance**: Easier regulatory compliance with audit trails

### 📊 Budget and Resource Estimation

#### Infrastructure Costs (Annual)
```yaml
Cloud Infrastructure:
  - EKS Cluster: $15,000
  - RDS PostgreSQL: $12,000  
  - ElastiCache Redis: $8,000
  - S3 Storage: $3,000
  - Load Balancers: $2,400
  - Monitoring: $6,000
  Total Infrastructure: $46,400/year

Tooling & Services:
  - CI/CD Platform: $3,600
  - Monitoring Tools: $12,000
  - Security Tools: $8,000
  - Backup Services: $2,400
  Total Tooling: $26,000/year
```

#### Team Resource Requirements
```yaml
Development Team:
  - Senior Spring Boot Developer: 2 FTE x 6 months
  - DevOps Engineer: 1 FTE x 8 months  
  - Database Engineer: 0.5 FTE x 4 months
  - Security Engineer: 0.5 FTE x 6 months
  - QA Engineer: 1 FTE x 6 months
  
External Support:
  - Spring Boot Consultant: $50,000
  - Security Audit: $25,000
  - Performance Testing: $15,000
  Total External: $90,000
```

Цей comprehensive план забезпечує enterprise-grade міграцію з мінімальними ризиками та максимальними перевагами для університетської LMS системи.

