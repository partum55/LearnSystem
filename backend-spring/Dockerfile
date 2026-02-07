# Multi-stage build for Spring Boot microservices
# Optimized for fast builds and small images

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS build

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

WORKDIR /build

# Copy parent POM and common module first (for better caching)
COPY pom.xml .
COPY lms-common/pom.xml ./lms-common/

# Copy all service POMs
COPY lms-user-service/pom.xml ./lms-user-service/
COPY lms-course-service/pom.xml ./lms-course-service/
COPY lms-assessment-service/pom.xml ./lms-assessment-service/
COPY lms-submission-service/pom.xml ./lms-submission-service/
COPY lms-gradebook-service/pom.xml ./lms-gradebook-service/
COPY lms-deadline-service/pom.xml ./lms-deadline-service/
COPY lms-ai-service/pom.xml ./lms-ai-service/
COPY lms-analytics-service/pom.xml ./lms-analytics-service/
COPY lms-api-gateway/pom.xml ./lms-api-gateway/
COPY lms-eureka-server/pom.xml ./lms-eureka-server/

# Download dependencies (cached if POMs don't change)
RUN mvn dependency:go-offline -B || true

# Copy source code
COPY lms-common/src ./lms-common/src
COPY lms-user-service/src ./lms-user-service/src
COPY lms-course-service/src ./lms-course-service/src
COPY lms-assessment-service/src ./lms-assessment-service/src
COPY lms-submission-service/src ./lms-submission-service/src
COPY lms-gradebook-service/src ./lms-gradebook-service/src
COPY lms-deadline-service/src ./lms-deadline-service/src
COPY lms-ai-service/src ./lms-ai-service/src
COPY lms-analytics-service/src ./lms-analytics-service/src
COPY lms-api-gateway/src ./lms-api-gateway/src
COPY lms-eureka-server/src ./lms-eureka-server/src

# Build the specific service
RUN mvn clean package -pl ${SERVICE_NAME} -am -DskipTests -B

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring

# Copy the JAR file
COPY --from=build /build/${SERVICE_NAME}/target/*.jar app.jar

# Change ownership
RUN chown spring:spring app.jar

USER spring:spring

# Expose port (will be overridden by docker-compose)
EXPOSE 8080

# JVM options for containerized environment
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
