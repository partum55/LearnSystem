# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /build

# 1. Modules — copy ALL pom.xml files first (cached until any dep changes)
COPY pom.xml .
COPY common/pom.xml            ./common/
COPY user-service/pom.xml      ./user-service/
COPY learning-service/pom.xml  ./learning-service/
COPY ai-service/pom.xml        ./ai-service/
COPY analytics-service/pom.xml ./analytics-service/
COPY gateway/pom.xml           ./gateway/

RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline -B || true

# 2. Code — shared modules first, then this service's source
COPY common/src            ./common/src
COPY gateway/src           ./gateway/src

# 3. Run — build this service only
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn clean package -pl gateway -am -DskipTests -B

# ── Stage 2: Extract layers ───────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /extractor
COPY --from=build /build/gateway/target/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

# 1. Environment — system packages
RUN apk add --no-cache curl
RUN addgroup -S spring && adduser -S spring -G spring
WORKDIR /app

# 2. Env
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -Djava.security.egd=file:/dev/./urandom"

# 3. Code — layers ordered by change frequency (least → most)
COPY --from=extractor --chown=spring:spring /extractor/dependencies/          ./
COPY --from=extractor --chown=spring:spring /extractor/spring-boot-loader/    ./
COPY --from=extractor --chown=spring:spring /extractor/snapshot-dependencies/ ./
COPY --from=extractor --chown=spring:spring /extractor/application/           ./

USER spring:spring

# 4. Run
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
