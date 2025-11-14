# Security Architecture Overview

## System Architecture with Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser/App)                       │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTPS/TLS 1.3
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                         API GATEWAY (Optional)                       │
│                  DDoS Protection │ WAF │ Rate Limiting               │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
┌───────────────────▼──────┐   ┌──────────────▼──────────────────────┐
│   USER SERVICE :8080     │   │   COURSE SERVICE :8081              │
│   /api/auth/*           │   │   /api/courses/*                    │
│   /api/users/*          │   │                                     │
└──────────────────────────┘   └─────────────────────────────────────┘
         │                                    │
         └────────────────┬───────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    │          Security Filter Chain           │
    │                                           │
    │  ┌─────────────────────────────────────┐ │
    │  │  1. RateLimitingFilter              │ │
    │  │     • Check request rate            │ │
    │  │     • Bucket4j token bucket         │ │
    │  │     • Per-user/IP limits            │ │
    │  │     • Return 429 if exceeded        │ │
    │  └─────────────────────────────────────┘ │
    │                    ↓                     │
    │  ┌─────────────────────────────────────┐ │
    │  │  2. SecurityHeadersFilter           │ │
    │  │     • Inject OWASP headers          │ │
    │  │     • CSP, HSTS, X-Frame-Options    │ │
    │  │     • Generate nonce for CSP        │ │
    │  │     • Cache control for sensitive   │ │
    │  └─────────────────────────────────────┘ │
    │                    ↓                     │
    │  ┌─────────────────────────────────────┐ │
    │  │  3. JwtAuthenticationFilter         │ │
    │  │     • Extract JWT from header       │ │
    │  │     • Check token blacklist         │ │
    │  │     • Validate JWT signature        │ │
    │  │     • Load user from database       │ │
    │  │     • Set SecurityContext           │ │
    │  │     • Audit logging                 │ │
    │  └─────────────────────────────────────┘ │
    │                    ↓                     │
    │  ┌─────────────────────────────────────┐ │
    │  │  4. Spring Security                 │ │
    │  │     • URL-based authorization       │ │
    │  │     • Method-level security         │ │
    │  │     • Role checking                 │ │
    │  │     • Exception handling            │ │
    │  └─────────────────────────────────────┘ │
    └───────────────────┬───────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │Controller│   │ Service │   │Security │
    │  Layer  │◄─►│  Layer  │◄─►│Services │
    └────┬────┘   └────┬────┘   └────┬────┘
         │              │              │
         │         ┌────▼────┐   ┌────▼──────────────┐
         │         │   JPA   │   │  AccountLockout   │
         │         │ Repo    │   │  TokenBlacklist   │
         │         └────┬────┘   │  PasswordPolicy   │
         │              │        │  InputSanitizer   │
         └──────────────┼────────┤  AuditLogger      │
                        │        └───────────────────┘
                   ┌────▼────┐
                   │PostgreSQL│
                   │Database │
                   └─────────┘
                        
         ┌──────────────────────┐
         │       Redis          │
         │  • Token Blacklist   │
         │  • Rate Limit State  │
         │  • Account Lockouts  │
         │  • Session Cache     │
         └──────────────────────┘
```

## Security Flow for Authenticated Request

```
1. CLIENT REQUEST
   ↓
   [HTTPS/TLS Encryption]
   ↓
2. RATE LIMITING
   ├─ Check: Request count in time window
   ├─ Bucket4j Token Bucket Algorithm
   ├─ Pass → Continue
   └─ Fail → 429 Too Many Requests
   ↓
3. SECURITY HEADERS
   ├─ Inject: CSP, HSTS, X-Frame-Options
   ├─ Generate: CSP nonce
   └─ Continue
   ↓
4. JWT VALIDATION
   ├─ Extract: Bearer token from header
   ├─ Check: Token in blacklist (Redis)
   │   └─ If blacklisted → 401 Unauthorized
   ├─ Validate: JWT signature & expiration
   ├─ Load: User from database
   ├─ Verify: User is active
   ├─ Set: SecurityContext with authorities
   ├─ Log: Authentication event
   └─ Continue
   ↓
5. AUTHORIZATION
   ├─ Check: URL-based permissions
   ├─ Check: Method-level @PreAuthorize
   ├─ Verify: User roles/authorities
   ├─ Pass → Continue
   └─ Fail → 403 Forbidden
   ↓
6. CONTROLLER
   ├─ Input Validation: @Valid annotations
   ├─ Input Sanitization: XSS prevention
   └─ Business Logic
   ↓
7. SERVICE LAYER
   ├─ Business Validation
   ├─ Security Checks
   └─ Database Operations (JPA)
   ↓
8. RESPONSE
   ├─ Add: Security headers
   ├─ Add: CORS headers
   └─ Return to client
```

## Authentication Flow (Login)

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /api/auth/login
     │ {email, password}
     ↓
┌────────────────────────────┐
│  RateLimitingFilter        │
│  Check: Login attempts     │
│  Limit: 5 per 15 minutes   │
└────┬───────────────────────┘
     │ ✓ Within limit
     ↓
┌────────────────────────────┐
│  AccountLockoutService     │
│  Check: Account locked?    │
└────┬───────────────────────┘
     │ ✓ Not locked
     ↓
┌────────────────────────────┐
│  AuthController            │
│  • Input validation        │
│  • Email sanitization      │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  UserService               │
│  • Find user by email      │
│  • Verify password (Argon2)│
└────┬───────────────────────┘
     │
     ├─ ✗ Invalid credentials
     │  ↓
     │  ┌──────────────────────────┐
     │  │ AccountLockoutService    │
     │  │ • Increment failed count │
     │  │ • Lock if >= 5 attempts  │
     │  └──────────────────────────┘
     │  ↓
     │  ┌──────────────────────────┐
     │  │ SecurityAuditLogger      │
     │  │ • Log failed attempt     │
     │  └──────────────────────────┘
     │  ↓
     │  401 Unauthorized
     │
     ├─ ✓ Valid credentials
     ↓
┌────────────────────────────┐
│  JwtService                │
│  • Generate access token   │
│  • Generate refresh token  │
│  • Add claims (user, role) │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  AccountLockoutService     │
│  • Clear failed attempts   │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  SecurityAuditLogger       │
│  • Log successful login    │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  Response                  │
│  {                         │
│    accessToken: "...",     │
│    refreshToken: "...",    │
│    user: {...}             │
│  }                         │
└────────────────────────────┘
```

## Token Revocation Flow (Logout)

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /api/auth/logout
     │ Authorization: Bearer <token>
     ↓
┌────────────────────────────┐
│  JwtAuthenticationFilter   │
│  • Validate token          │
│  • Extract user ID         │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  AuthController            │
│  • Get token from header   │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  JwtTokenBlacklistService  │
│  • Add token to blacklist  │
│  • Set TTL = token exp     │
│  • Store in Redis          │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  SecurityAuditLogger       │
│  • Log token revocation    │
└────┬───────────────────────┘
     │
     ↓
     200 OK {message: "Logged out"}
```

## Password Change Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /api/users/change-password
     │ {oldPassword, newPassword}
     ↓
┌────────────────────────────┐
│  PasswordPolicyValidator   │
│  • Check length >= 12      │
│  • Check complexity (3/4)  │
│  • Check common patterns   │
│  • Check repetition        │
└────┬───────────────────────┘
     │ ✓ Valid
     ↓
┌────────────────────────────┐
│  UserService               │
│  • Verify old password     │
│  • Hash new password       │
│  • Update in database      │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  JwtTokenBlacklistService  │
│  • Revoke all user tokens  │
└────┬───────────────────────┘
     │
     ↓
┌────────────────────────────┐
│  SecurityAuditLogger       │
│  • Log password change     │
└────┬───────────────────────┘
     │
     ↓
     200 OK {message: "Password changed"}
```

## Security Event Monitoring

```
┌─────────────────────────────────────────────┐
│         Security Events (Real-time)         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          SecurityAuditLogger                │
│  • Authentication attempts                  │
│  • Account lockouts                         │
│  • Token revocations                        │
│  • Privilege escalations                    │
│  • Rate limit violations                    │
│  • Invalid tokens                           │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│          Application Logs                   │
│  • File: /var/log/lms/user-service.log     │
│  • Rotation: 10MB, 30 days                  │
│  • Format: JSON/Text                        │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│       Log Aggregation (Optional)            │
│  • ELK Stack (Elasticsearch/Kibana)         │
│  • Splunk                                   │
│  • AWS CloudWatch                           │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│          Alerting System                    │
│  • Failed login threshold exceeded          │
│  • Multiple account lockouts                │
│  • Unusual token activity                   │
│  • High rate limit violations               │
└─────────────────────────────────────────────┘
```

## Data Flow with Security

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. HTTPS Request
       │    + JWT Token
       ↓
┌──────────────────────────┐
│  Filter Chain            │
│  ├─ Rate Limiting        │
│  ├─ Security Headers     │
│  └─ JWT Authentication   │
└──────┬───────────────────┘
       │ 2. Authenticated Request
       │    + SecurityContext
       ↓
┌──────────────────────────┐
│  Controller              │
│  └─ Input Validation     │
└──────┬───────────────────┘
       │ 3. Sanitized Input
       ↓
┌──────────────────────────┐
│  Service Layer           │
│  └─ Business Logic       │
└──────┬───────────────────┘
       │ 4. Data Operations
       ↓
┌──────────────────────────┐
│  PostgreSQL              │
│  └─ Encrypted at rest    │
└──────┬───────────────────┘
       │ 5. Query Results
       ↓
┌──────────────────────────┐
│  Response Builder        │
│  └─ Data serialization   │
└──────┬───────────────────┘
       │ 6. HTTPS Response
       │    + Security Headers
       ↓
┌─────────────┐
│   Client    │
└─────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────┐
│          Security Technologies              │
├─────────────────────────────────────────────┤
│ Authentication                              │
│  • Spring Security 6.x                      │
│  • JJWT 0.12.3 (JWT)                        │
│  • Argon2 (Password Hashing)                │
├─────────────────────────────────────────────┤
│ Rate Limiting                               │
│  • Bucket4j 8.7.0                           │
├─────────────────────────────────────────────┤
│ Storage                                     │
│  • PostgreSQL (User Data)                   │
│  • Redis (Token Blacklist, Rate Limits)     │
├─────────────────────────────────────────────┤
│ Monitoring                                  │
│  • Spring Boot Actuator                     │
│  • Micrometer + Prometheus                  │
├─────────────────────────────────────────────┤
│ Validation                                  │
│  • Hibernate Validator                      │
│  • Custom Input Sanitizers                  │
└─────────────────────────────────────────────┘
```

## Security Layers

```
┌──────────────────────────────────────────┐
│  Layer 7: Business Logic Security       │
│  • Input validation                      │
│  • Data sanitization                     │
│  • Business rule enforcement             │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│  Layer 6: Application Security           │
│  • JWT authentication                    │
│  • Authorization checks                  │
│  • Token blacklist                       │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│  Layer 5: Framework Security             │
│  • Spring Security filters               │
│  • CORS configuration                    │
│  • CSRF protection                       │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│  Layer 4: Network Security               │
│  • Rate limiting                         │
│  • DDoS protection                       │
│  • Firewall rules                        │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│  Layer 3: Transport Security             │
│  • HTTPS/TLS 1.3                         │
│  • Certificate validation                │
│  • Strong ciphers                        │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│  Layer 2: Infrastructure Security        │
│  • Security headers (CSP, HSTS)          │
│  • WAF (Web Application Firewall)        │
│  • Load balancer security                │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│  Layer 1: Database Security              │
│  • Encryption at rest                    │
│  • Network isolation                     │
│  • Minimal privileges                    │
└──────────────────────────────────────────┘
```

---

*This architecture implements Defense in Depth strategy with multiple security layers*

