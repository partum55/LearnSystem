# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /build

# 1. Environment — base image provides Maven + JDK 21

# 2. Modules — copy ALL pom.xml files first (cached until any dep changes)
COPY pom.xml .
COPY lms-common/pom.xml            ./lms-common/
COPY lms-plugin-sdk/pom.xml        ./lms-plugin-sdk/
COPY lms-plugin-runtime/pom.xml    ./lms-plugin-runtime/
COPY lms-user-service/pom.xml      ./lms-user-service/
COPY lms-learning-service/pom.xml  ./lms-learning-service/
COPY lms-ai-service/pom.xml        ./lms-ai-service/
COPY lms-api-gateway/pom.xml       ./lms-api-gateway/

RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline -B || true

# 3. Code — shared modules first, then this service's source
COPY lms-common/src            ./lms-common/src
COPY lms-plugin-sdk/src        ./lms-plugin-sdk/src
COPY lms-plugin-runtime/src    ./lms-plugin-runtime/src
COPY lms-learning-service/src  ./lms-learning-service/src

# 4. Run — build this service only
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn clean package -pl lms-learning-service -am -DskipTests -B

# ── Stage 2: Extract layers ───────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /extractor
COPY --from=build /build/lms-learning-service/target/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

# 1. Environment — system packages (curl + Python for plugin sidecar)
RUN apk add --no-cache curl python3 py3-pip
RUN addgroup -S spring && adduser -S spring -G spring
RUN mkdir -p /data/plugins/python /data/submissions
WORKDIR /app

# 2. Env
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -Djava.security.egd=file:/dev/./urandom"

# 3. Code — layers ordered by change frequency (least → most)
COPY --from=extractor --chown=spring:spring /extractor/dependencies/          ./
COPY --from=extractor --chown=spring:spring /extractor/spring-boot-loader/    ./
COPY --from=extractor --chown=spring:spring /extractor/snapshot-dependencies/ ./
COPY --from=extractor --chown=spring:spring /extractor/application/           ./
RUN chown -R spring:spring /data

USER spring:spring

# 4. Run
EXPOSE 8089
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
