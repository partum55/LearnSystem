# LMS Gradebook Service

Gradebook management microservice for the Learning Management System (LMS). Responsible for gradebook entries, categories, grade summaries, and audit history, migrated from the legacy Django `gradebook` app.

## Capabilities
- Gradebook entries per student & assignment
- Weighted gradebook categories and drop-lowest rules
- Course-grade summaries with letter-grade calculation
- Grade change auditing and history
- Secure REST APIs with JWT, rate limiting, and hardened headers via `lms-common`

## Status
- ✅ Project scaffolded (Spring Boot 3.2, Java 21)
- 🚧 Domain models, services, and controllers in progress
- 🔐 Security wired via shared module once endpoints exist

## Development
```bash
cd backend-spring/lms-gradebook-service
mvn spring-boot:run
```

Configure datasource, Redis, and JWT values via environment variables or `application.yml` (see parent project docs).

