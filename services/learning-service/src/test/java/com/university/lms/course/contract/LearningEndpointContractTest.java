package com.university.lms.course.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.university.lms.course.assignments.controller.CanonicalAssignmentController;
import com.university.lms.course.courses.controller.CanonicalCourseController;
import com.university.lms.course.gradebook.controller.CanonicalGradebookController;
import com.university.lms.course.quizzes.controller.CanonicalQuizAttemptController;
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
import org.springframework.util.ClassUtils;
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
    assertBasePath(CanonicalCourseController.class, "/v1/courses");
    assertBasePath(CanonicalAssignmentController.class, "/v1");
    assertBasePath(CanonicalQuizAttemptController.class, "/v1");
    assertBasePath(CanonicalGradebookController.class, "/v1/courses/{courseId}/gradebook");
  }

  @Test
  void canonicalControllersMustExposeCoreRoutes() {
    assertMethodPath(CanonicalCourseController.class, "myActiveCourses", "/my-active");
    assertMethodPath(CanonicalCourseController.class, "overview", "/{courseId}/overview");
    assertMethodPath(CanonicalCourseController.class, "modules", "/{courseId}/modules");
    assertMethodPath(CanonicalCourseController.class, "myGradebook", "/{courseId}/gradebook/me");
    assertMethodPath(CanonicalAssignmentController.class, "submitFile", "/assignments/{assignmentId}/submissions/file");
    assertMethodPath(CanonicalAssignmentController.class, "submitRte", "/assignments/{assignmentId}/submissions/rte");
    assertMethodPath(CanonicalAssignmentController.class, "submitForm", "/assignments/{assignmentId}/submissions/form");
    assertMethodPath(CanonicalAssignmentController.class, "submitVpl", "/assignments/{assignmentId}/submissions/vpl");
    assertMethodPath(CanonicalAssignmentController.class, "saveDraft", "/submissions/{submissionId}/grade-draft");
    assertMethodPath(CanonicalAssignmentController.class, "publish", "/submissions/{submissionId}/publish-grade");
    assertMethodPath(CanonicalQuizAttemptController.class, "start", "/assignments/{assignmentId}/quiz-attempts");
    assertMethodPath(CanonicalQuizAttemptController.class, "submit", "/quiz-attempts/{attemptId}/submit");
    assertMethodPath(CanonicalQuizAttemptController.class, "review", "/quiz-attempts/{attemptId}/review");
  }

  @Test
  void learningServiceMustNotExposeLegacyExecutionOrSubmissionControllers() {
    assertThat(ClassUtils.isPresent(
        "com.university.lms.course.assessment.web.VirtualLabController",
        getClass().getClassLoader())).isFalse();
    assertThat(ClassUtils.isPresent(
        "com.university.lms.submission.web.SubmissionController",
        getClass().getClassLoader())).isFalse();
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
