package com.university.lms.course.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.university.lms.deadline.calendar.web.CalendarController;
import com.university.lms.deadline.deadline.web.DeadlineController;
import com.university.lms.deadline.notification.web.NotificationController;
import com.university.lms.submission.web.SubmissionController;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;

class LearningEndpointContractTest {

  @Test
  void apiContextPathMustRemainApi() {
    Properties properties = loadYamlProperties("application.yml");
    assertThat(properties.getProperty("server.servlet.context-path")).isEqualTo("/api");
  }

  @Test
  void controllersMustExposeExpectedBasePaths() {
    assertBasePath(SubmissionController.class, "/submissions");
    assertBasePath(DeadlineController.class, "/deadlines");
    assertBasePath(CalendarController.class, "/calendar");
    assertBasePath(NotificationController.class, "/notifications");
  }

  @Test
  void submissionControllerMustExposeCoreRoutes() {
    assertMethodPath(SubmissionController.class, "createDraft", "");
    assertMethodPath(SubmissionController.class, "createMultipart", "");
    assertMethodPath(SubmissionController.class, "submit", "/{submissionId}/submit");
    assertMethodPath(SubmissionController.class, "grade", "/{submissionId}/grade");
    assertMethodPath(SubmissionController.class, "getSpeedgraderQueue", "/speedgrader");
  }

  @Test
  void deadlineAndCalendarControllersMustExposeSchedulingRoutes() {
    assertMethodPath(DeadlineController.class, "getDeadlinesForGroup", "/group/{studentGroupId}");
    assertMethodPath(CalendarController.class, "getMonth", "/student/{studentGroupId}/month");
    assertMethodPath(CalendarController.class, "getConflicts", "/student/{studentGroupId}/conflicts");
    assertMethodPath(CalendarController.class, "downloadIcs", "/student/{studentGroupId}/ics");
  }

  @Test
  void notificationControllerMustExposeListAndCountRoutes() {
    assertMethodPath(NotificationController.class, "getNotifications", "");
    assertMethodPath(NotificationController.class, "getNotificationCount", "/count");
  }

  private static void assertBasePath(Class<?> controllerClass, String expectedPath) {
    RequestMapping requestMapping = controllerClass.getAnnotation(RequestMapping.class);
    assertThat(requestMapping)
        .withFailMessage("Missing @RequestMapping on %s", controllerClass.getSimpleName())
        .isNotNull();

    Set<String> paths = normalizePaths(requestMapping.path(), requestMapping.value());
    assertThat(paths).contains(expectedPath);
  }

  private static void assertMethodPath(
      Class<?> controllerClass, String methodName, String expectedPath) {
    Method method =
        Arrays.stream(controllerClass.getDeclaredMethods())
            .filter(candidate -> candidate.getName().equals(methodName))
            .findFirst()
            .orElseThrow(
                () ->
                    new AssertionError(
                        "Missing method " + methodName + " on " + controllerClass.getSimpleName()));

    Set<String> paths = methodPaths(method);
    assertThat(paths)
        .withFailMessage(
            "Method %s.%s should expose path '%s' but had %s",
            controllerClass.getSimpleName(), methodName, expectedPath, paths)
        .contains(expectedPath);
  }

  private static Set<String> methodPaths(Method method) {
    GetMapping getMapping = method.getAnnotation(GetMapping.class);
    if (getMapping != null) {
      return normalizePaths(getMapping.path(), getMapping.value());
    }

    PostMapping postMapping = method.getAnnotation(PostMapping.class);
    if (postMapping != null) {
      return normalizePaths(postMapping.path(), postMapping.value());
    }

    PutMapping putMapping = method.getAnnotation(PutMapping.class);
    if (putMapping != null) {
      return normalizePaths(putMapping.path(), putMapping.value());
    }

    PatchMapping patchMapping = method.getAnnotation(PatchMapping.class);
    if (patchMapping != null) {
      return normalizePaths(patchMapping.path(), patchMapping.value());
    }

    DeleteMapping deleteMapping = method.getAnnotation(DeleteMapping.class);
    if (deleteMapping != null) {
      return normalizePaths(deleteMapping.path(), deleteMapping.value());
    }

    RequestMapping requestMapping = method.getAnnotation(RequestMapping.class);
    if (requestMapping != null) {
      return normalizePaths(requestMapping.path(), requestMapping.value());
    }

    throw new AssertionError("No mapping annotation found on method " + method.getName());
  }

  private static Set<String> normalizePaths(String[] pathValues, String[] fallbackValues) {
    String[] rawPaths = pathValues.length > 0 ? pathValues : fallbackValues;
    if (rawPaths.length == 0) {
      return Set.of("");
    }

    return Arrays.stream(rawPaths)
        .map(String::trim)
        .map(path -> path.isEmpty() ? "" : (path.startsWith("/") ? path : "/" + path))
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private static Properties loadYamlProperties(String resourceName) {
    YamlPropertiesFactoryBean yamlFactory = new YamlPropertiesFactoryBean();
    yamlFactory.setResources(new ClassPathResource(resourceName));
    return Objects.requireNonNull(
        yamlFactory.getObject(), () -> "Unable to read yaml: " + resourceName);
  }
}
