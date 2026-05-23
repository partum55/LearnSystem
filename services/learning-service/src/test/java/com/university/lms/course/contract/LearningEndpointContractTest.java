package com.university.lms.course.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.university.lms.course.assignments.controller.CanonicalAssignmentController;
import com.university.lms.course.courses.controller.CanonicalCourseController;
import com.university.lms.course.gradebook.controller.CanonicalGradebookController;
import com.university.lms.course.materials.controller.CanonicalLearningItemController;
import com.university.lms.course.materials.repository.LearningItemRepository;
import com.university.lms.course.materials.repository.LessonBlockRepository;
import com.university.lms.course.materials.service.LearningContentService;
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
    assertBasePath(CanonicalLearningItemController.class, "/v1");
    assertBasePath(CanonicalAssignmentController.class, "/v1");
    assertBasePath(CanonicalGradebookController.class, "/v1/courses/{courseId}/gradebook");
  }

  @Test
  void canonicalControllersMustExposeCoreRoutes() {
    assertMethodPath(CanonicalCourseController.class, "myActiveCourses", "/my-active");
    assertMethodPath(CanonicalCourseController.class, "overview", "/{courseId}/overview");
    assertMethodPath(CanonicalCourseController.class, "modules", "/{courseId}/modules");
    assertMethodPath(CanonicalCourseController.class, "myGradebook", "/{courseId}/gradebook/me");
    assertMethodPath(CanonicalLearningItemController.class, "createLearningItem", "/courses/{courseId}/modules/{moduleId}/learning-items");
    assertMethodPath(CanonicalLearningItemController.class, "getLearningItem", "/learning-items/{learningItemId}");
    assertMethodPath(CanonicalLearningItemController.class, "updateLearningItem", "/learning-items/{learningItemId}");
    assertMethodPath(CanonicalLearningItemController.class, "archiveLearningItem", "/learning-items/{learningItemId}");
    assertMethodPath(CanonicalLearningItemController.class, "listBlocks", "/learning-items/{learningItemId}/blocks");
    assertMethodPath(CanonicalLearningItemController.class, "createBlock", "/learning-items/{learningItemId}/blocks");
    assertMethodPath(CanonicalLearningItemController.class, "updateBlock", "/learning-items/{learningItemId}/blocks/{blockId}");
    assertMethodPath(CanonicalLearningItemController.class, "deleteBlock", "/learning-items/{learningItemId}/blocks/{blockId}");
    assertMethodPath(CanonicalLearningItemController.class, "reorderBlocks", "/learning-items/{learningItemId}/blocks/reorder");
    assertMethodPath(CanonicalAssignmentController.class, "submitFile", "/assignments/{assignmentId}/submissions/file");
    assertMethodPath(CanonicalAssignmentController.class, "submitText", "/assignments/{assignmentId}/submissions/text");
    assertMethodPath(CanonicalAssignmentController.class, "submitForm", "/assignments/{assignmentId}/submissions/form");
    assertMethodPath(CanonicalAssignmentController.class, "submitVpl", "/assignments/{assignmentId}/submissions/vpl");
    assertMethodPath(CanonicalAssignmentController.class, "saveDraft", "/submissions/{submissionId}/grade-draft");
    assertMethodPath(CanonicalAssignmentController.class, "publish", "/submissions/{submissionId}/publish-grade");
  }

  @Test
  void canonicalLearningContentRoutesMustNotUseMaterialOrLessonTopLevelNames() {
    Set<String> paths = controllerPaths(CanonicalLearningItemController.class);

    assertThat(paths).noneMatch(path -> path.contains("/materials"));
    assertThat(paths).noneMatch(path -> path.startsWith("/lessons"));
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

  @Test
  void canonicalLearningContentMustUseCanonicalRepositories() {
    Set<Class<?>> fieldTypes = Arrays.stream(LearningContentService.class.getDeclaredFields())
        .map(java.lang.reflect.Field::getType)
        .collect(Collectors.toSet());

    assertThat(fieldTypes).contains(LearningItemRepository.class, LessonBlockRepository.class);
    assertThat(fieldTypes.stream().map(Class::getSimpleName)).doesNotContain("ResourceRepository");
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

  private static Set<String> controllerPaths(Class<?> controllerClass) {
    return Arrays.stream(controllerClass.getDeclaredMethods())
        .flatMap(method -> methodPaths(method).stream())
        .collect(Collectors.toCollection(LinkedHashSet::new));
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
