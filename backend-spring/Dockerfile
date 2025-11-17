# Multi-stage build for Spring Boot application
FROM maven:3.9-eclipse-temurin-21-alpine AS build

# ARG to specify which service to build (default: lms-user-service)
ARG SERVICE_NAME=lms-user-service

WORKDIR /app

# Copy parent POM and all module POMs for reactor build
COPY pom.xml .
COPY lms-common/pom.xml ./lms-common/
COPY lms-user-service/pom.xml ./lms-user-service/
COPY lms-course-service/pom.xml ./lms-course-service/
COPY lms-assessment-service/pom.xml ./lms-assessment-service/
COPY lms-gradebook-service/pom.xml ./lms-gradebook-service/
COPY lms-deadline-service/pom.xml ./lms-deadline-service/
COPY lms-ai-service/pom.xml ./lms-ai-service/
COPY lms-api-gateway/pom.xml ./lms-api-gateway/
COPY lms-eureka-server/pom.xml ./lms-eureka-server/

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy all source code
COPY lms-common/src ./lms-common/src
COPY lms-user-service/src ./lms-user-service/src
COPY lms-course-service/src ./lms-course-service/src
COPY lms-assessment-service/src ./lms-assessment-service/src
COPY lms-gradebook-service/src ./lms-gradebook-service/src
COPY lms-deadline-service/src ./lms-deadline-service/src
COPY lms-ai-service/src ./lms-ai-service/src
COPY lms-api-gateway/src ./lms-api-gateway/src
COPY lms-eureka-server/src ./lms-eureka-server/src

# Build the specified service
RUN mvn clean package -pl ${SERVICE_NAME} -am -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

ARG SERVICE_NAME=lms-user-service

WORKDIR /app

# Add non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the JAR from build stage (use wildcard to match any service)
COPY --from=build /app/${SERVICE_NAME}/target/*.jar app.jar

# Expose port (will be overridden by docker-compose)
EXPOSE 8080

# Health check (generic - works for any service)
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-jar", \
    "app.jar"]
