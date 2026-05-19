package com.university.lms.apigateway.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

class GatewayRouteContractTest {

  private static final String LEARNING_SERVICE_URI_MAIN = "${LEARNING_SERVICE_URL:http://localhost:8089}";
  private static final String LEARNING_SERVICE_URI_DOCKER = "${LEARNING_SERVICE_URL:http://learning-service:8089}";
  private static final String USER_SERVICE_URI_MAIN = "${USER_SERVICE_URL:http://localhost:8081}";
  private static final String USER_SERVICE_URI_DOCKER = "${USER_SERVICE_URL:http://user-service:8081}";

  @ParameterizedTest
  @ValueSource(strings = {"application.yml", "application-docker.yml"})
  void learningRoutesMustPointToLearningService(String resourceName) {
    List<Map<String, Object>> routes = loadRoutes(resourceName);

    assertLearningRoute(
        routes,
        "learning-courses",
        expectedLearningUri(resourceName),
        Set.of("/api/v1/courses/**", "/api/courses/**"));

    assertLearningRoute(
        routes,
        "learning-assessments",
        expectedLearningUri(resourceName),
        Set.of("/api/v1/assessments/**", "/api/assessments/**"));

    assertLearningRoute(
        routes,
        "learning-quiz-attempts",
        expectedLearningUri(resourceName),
        Set.of(
            "/api/v1/assessments/quiz-attempts/**",
            "/api/assessments/quiz-attempts/**"));

    assertLearningRoute(
        routes,
        "learning-assignment-documents",
        expectedLearningUri(resourceName),
        Set.of(
            "/api/assignments/*/template-document",
            "/api/assignments/*/submissions/clone-template"));

    assertLearningRoute(
        routes,
        "learning-submission-documents",
        expectedLearningUri(resourceName),
        Set.of("/api/submissions/*/document"));

    assertLearningRoute(
        routes,
        "learning-submissions",
        expectedLearningUri(resourceName),
        Set.of("/api/v1/submissions/**", "/api/submissions/**"));

    assertLearningRoute(
        routes,
        "learning-gradebook",
        expectedLearningUri(resourceName),
        Set.of("/api/v1/gradebook/**", "/api/gradebook/**"));

    assertLearningRoute(
        routes,
        "learning-deadlines",
        expectedLearningUri(resourceName),
        Set.of(
            "/api/v1/calendar/**",
            "/api/calendar/**",
            "/api/v1/deadlines/**",
            "/api/deadlines/**",
            "/api/v1/notifications/**",
            "/api/notifications/**"));

    assertLearningRoute(
        routes, "plugin-management", expectedLearningUri(resourceName), Set.of("/api/plugins/**"));

    assertLearningRoute(
        routes,
        "learning-risk-analytics",
        expectedLearningUri(resourceName),
        Set.of(
            "/api/analytics/courses/*/at-risk-students",
            "/api/analytics/courses/*/students/*/risk",
            "/api/v1/analytics/courses/*/at-risk-students",
            "/api/v1/analytics/courses/*/students/*/risk"));

    assertRouteUri(routes, "analytics-service", expectedLearningUri(resourceName));
    assertRouteUri(routes, "marketplace-service", expectedLearningUri(resourceName));
    assertRouteUri(routes, "user-service", expectedUserUri(resourceName));
  }

  @ParameterizedTest
  @ValueSource(strings = {"application.yml", "application-docker.yml"})
  void pathPredicatesMustNotUseDoubleWildcardInMiddle(String resourceName) {
    List<Map<String, Object>> routes = loadRoutes(resourceName);

    Set<String> invalidPatterns =
        routes.stream()
            .flatMap(route -> extractPathPatterns(route).stream())
            .filter(path -> path.contains("**/"))
            .collect(Collectors.toCollection(LinkedHashSet::new));

    assertThat(invalidPatterns)
        .as("Path predicates cannot contain `**/` with Spring PathPattern parser")
        .isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"application.yml", "application-docker.yml"})
  void marketplaceRouteMustPointToLearningService(String resourceName) {
    List<Map<String, Object>> routes = loadRoutes(resourceName);

    Map<String, Object> route =
        routes.stream()
            .filter(candidate -> "marketplace-service".equals(candidate.get("id")))
            .findFirst()
            .orElseThrow(() -> new AssertionError("Missing gateway route: marketplace-service"));

    assertThat(route.get("uri")).isEqualTo(expectedLearningUri(resourceName));
    assertThat(extractPathPatterns(route)).contains("/api/marketplace/**");
  }

  private static void assertLearningRoute(
      List<Map<String, Object>> routes,
      String routeId,
      String expectedUri,
      Set<String> expectedPathPatterns) {

    Map<String, Object> route =
        routes.stream()
            .filter(candidate -> routeId.equals(candidate.get("id")))
            .findFirst()
            .orElseThrow(() -> new AssertionError("Missing gateway route: " + routeId));

    assertThat(route.get("uri")).isEqualTo(expectedUri);
    assertThat(extractPathPatterns(route)).containsAll(expectedPathPatterns);
  }

  private static void assertRouteUri(
      List<Map<String, Object>> routes, String routeId, String expectedUri) {
    Map<String, Object> route =
        routes.stream()
            .filter(candidate -> routeId.equals(candidate.get("id")))
            .findFirst()
            .orElseThrow(() -> new AssertionError("Missing gateway route: " + routeId));
    assertThat(route.get("uri")).isEqualTo(expectedUri);
  }

  private static String expectedLearningUri(String resourceName) {
    return "application-docker.yml".equals(resourceName)
        ? LEARNING_SERVICE_URI_DOCKER
        : LEARNING_SERVICE_URI_MAIN;
  }

  private static String expectedUserUri(String resourceName) {
    return "application-docker.yml".equals(resourceName) ? USER_SERVICE_URI_DOCKER : USER_SERVICE_URI_MAIN;
  }

  private static Set<String> extractPathPatterns(Map<String, Object> route) {
    Object predicatesValue = route.get("predicates");
    if (!(predicatesValue instanceof List<?> predicates)) {
      return Set.of();
    }

    return predicates.stream()
        .filter(String.class::isInstance)
        .map(String.class::cast)
        .filter(predicate -> predicate.startsWith("Path="))
        .map(predicate -> predicate.substring("Path=".length()))
        .flatMap(paths -> Arrays.stream(paths.split(",")))
        .map(String::trim)
        .filter(path -> !path.isBlank())
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private static List<Map<String, Object>> loadRoutes(String resourceName) {
    ClassPathResource resource = new ClassPathResource(resourceName);
    Yaml yaml = new Yaml();

    try (InputStream inputStream = resource.getInputStream()) {
      Map<String, Object> root =
          Objects.requireNonNull(yaml.load(inputStream), "YAML root cannot be null");

      Map<String, Object> spring = asMap(root.get("spring"), "spring", resourceName);
      Map<String, Object> cloud = asMap(spring.get("cloud"), "spring.cloud", resourceName);
      Map<String, Object> gateway =
          asMap(cloud.get("gateway"), "spring.cloud.gateway", resourceName);

      Object routesValue = gateway.get("routes");
      if (!(routesValue instanceof List<?> rawRoutes)) {
        throw new AssertionError("No gateway routes found in " + resourceName);
      }

      return rawRoutes.stream()
          .map(route -> asMap(route, "route", resourceName))
          .collect(Collectors.toList());
    } catch (IOException exception) {
      throw new AssertionError("Unable to read gateway config: " + resourceName, exception);
    }
  }

  private static Map<String, Object> asMap(Object value, String section, String resourceName) {
    if (value instanceof Map<?, ?> rawMap) {
      Map<String, Object> mapped = new LinkedHashMap<>();
      rawMap.forEach((key, rawValue) -> mapped.put(String.valueOf(key), rawValue));
      return mapped;
    }

    throw new AssertionError("Expected map for '" + section + "' in " + resourceName);
  }
}
