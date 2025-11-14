# Multi-stage build for Spring Boot application
FROM maven:3.9-eclipse-temurin-21-alpine AS build

WORKDIR /app

# Copy parent POM and common module first for better caching
COPY pom.xml .
COPY lms-common/pom.xml ./lms-common/
COPY lms-user-service/pom.xml ./lms-user-service/
# Add newly added modules so parent reactor sees them
COPY lms-course-service/pom.xml ./lms-course-service/
COPY lms-assessment-service/pom.xml ./lms-assessment-service/
COPY lms-ai-service/pom.xml ./lms-ai-service/

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY lms-common/src ./lms-common/src
COPY lms-user-service/src ./lms-user-service/src
# Also copy sources of additional modules to satisfy reactor layout (even if not built here)
COPY lms-course-service/src ./lms-course-service/src
COPY lms-assessment-service/src ./lms-assessment-service/src
COPY lms-ai-service/src ./lms-ai-service/src

# Build the application
RUN mvn clean package -pl lms-user-service -am -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Add non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the JAR from build stage
COPY --from=build /app/lms-user-service/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-jar", \
    "app.jar"]
