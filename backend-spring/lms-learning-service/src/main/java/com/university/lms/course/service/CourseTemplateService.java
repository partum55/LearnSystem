package com.university.lms.course.service;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.service.QuizService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.Module;
import com.university.lms.course.domain.Resource;
import com.university.lms.course.dto.CloneCourseStructureRequest;
import com.university.lms.course.dto.CloneCourseStructureResultDto;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.repository.ResourceRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Clones course structures for semester-to-semester reuse. */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseTemplateService {

  private static final String ROLE_SUPERADMIN = "SUPERADMIN";
  private static final String ROLE_TEACHER = "TEACHER";
  private static final String ENROLLMENT_ACTIVE = "active";

  private final CourseRepository courseRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final ModuleRepository moduleRepository;
  private final ResourceRepository resourceRepository;
  private final AssignmentRepository assignmentRepository;
  private final QuizService quizService;

  @Transactional
  @CacheEvict(
      value = {"courses", "modules", "resources", "assignments", "quizzes"},
      allEntries = true)
  public CloneCourseStructureResultDto cloneCourseStructure(
      UUID sourceCourseId,
      CloneCourseStructureRequest request,
      UUID userId,
      String userRole) {
    log.info(
        "Cloning structure from course {} into new code {} by user {}",
        sourceCourseId,
        request.getCode(),
        userId);

    Course sourceCourse =
        courseRepository
            .findById(sourceCourseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", sourceCourseId));
    if (!canUserManageCourse(sourceCourse, userId, userRole)) {
      throw new ValidationException("User does not have permission to clone this course");
    }
    if (courseRepository.existsByCode(request.getCode())) {
      throw new ValidationException("Course with code '" + request.getCode() + "' already exists");
    }

    LocalDate startDate = request.getStartDate();
    LocalDate endDate = request.getEndDate();
    validateDateRange(startDate, endDate);

    Course clonedCourse =
        Course.builder()
            .code(request.getCode())
            .titleUk(
                request.getTitleUk() != null && !request.getTitleUk().isBlank()
                    ? request.getTitleUk()
                    : sourceCourse.getTitleUk())
            .titleEn(
                request.getTitleEn() != null && !request.getTitleEn().isBlank()
                    ? request.getTitleEn()
                    : sourceCourse.getTitleEn())
            .descriptionUk(
                request.getDescriptionUk() != null
                    ? request.getDescriptionUk()
                    : sourceCourse.getDescriptionUk())
            .descriptionEn(
                request.getDescriptionEn() != null
                    ? request.getDescriptionEn()
                    : sourceCourse.getDescriptionEn())
            .syllabus(request.getSyllabus() != null ? request.getSyllabus() : sourceCourse.getSyllabus())
            .ownerId(userId)
            .visibility(
                request.getVisibility() != null ? request.getVisibility() : sourceCourse.getVisibility())
            .thumbnailUrl(
                request.getThumbnailUrl() != null
                    ? request.getThumbnailUrl()
                    : sourceCourse.getThumbnailUrl())
            .themeColor(
                request.getThemeColor() != null
                    ? request.getThemeColor()
                    : sourceCourse.getThemeColor())
            .startDate(startDate)
            .endDate(endDate)
            .academicYear(
                request.getAcademicYear() != null
                    ? request.getAcademicYear()
                    : sourceCourse.getAcademicYear())
            .departmentId(sourceCourse.getDepartmentId())
            .maxStudents(
                request.getMaxStudents() != null
                    ? request.getMaxStudents()
                    : sourceCourse.getMaxStudents())
            .status(Boolean.TRUE.equals(request.getIsPublished()) ? CourseStatus.PUBLISHED : CourseStatus.DRAFT)
            .isPublished(Boolean.TRUE.equals(request.getIsPublished()))
            .build();

    Course savedCourse = courseRepository.save(clonedCourse);
    addCourseMember(savedCourse, userId, ROLE_TEACHER, userId);

    boolean copyScheduleDates = Boolean.TRUE.equals(request.getCopyScheduleDates());
    CloneStats stats = copyModulesResourcesAssignments(sourceCourseId, savedCourse, userId, userRole, copyScheduleDates);

    return CloneCourseStructureResultDto.builder()
        .sourceCourseId(sourceCourseId)
        .courseId(savedCourse.getId())
        .modulesCopied(stats.modulesCopied)
        .resourcesCopied(stats.resourcesCopied)
        .assignmentsCopied(stats.assignmentsCopied)
        .quizzesCopied(stats.quizzesCopied)
        .build();
  }

  private CloneStats copyModulesResourcesAssignments(
      UUID sourceCourseId,
      Course targetCourse,
      UUID userId,
      String userRole,
      boolean copyScheduleDates) {
    Map<UUID, UUID> moduleMapping = new HashMap<>();
    int modulesCopied = 0;
    int resourcesCopied = 0;
    int assignmentsCopied = 0;
    int quizzesCopied = 0;

    List<Module> sourceModules = moduleRepository.findByCourseIdOrderByPositionAsc(sourceCourseId);
    for (Module sourceModule : sourceModules) {
      Module targetModule =
          moduleRepository.save(
              Module.builder()
                  .course(targetCourse)
                  .title(sourceModule.getTitle())
                  .description(sourceModule.getDescription())
                  .position(sourceModule.getPosition())
                  .contentMeta(
                      sourceModule.getContentMeta() == null
                          ? new HashMap<>()
                          : new HashMap<>(sourceModule.getContentMeta()))
                  .isPublished(sourceModule.getIsPublished())
                  .publishDate(copyScheduleDates ? sourceModule.getPublishDate() : null)
                  .build());
      moduleMapping.put(sourceModule.getId(), targetModule.getId());
      modulesCopied++;

      List<Resource> sourceResources = resourceRepository.findByModuleIdOrderByPositionAsc(sourceModule.getId());
      for (Resource sourceResource : sourceResources) {
        resourceRepository.save(
            Resource.builder()
                .module(targetModule)
                .title(sourceResource.getTitle())
                .description(sourceResource.getDescription())
                .resourceType(sourceResource.getResourceType())
                .fileUrl(sourceResource.getFileUrl())
                .externalUrl(sourceResource.getExternalUrl())
                .fileSize(sourceResource.getFileSize())
                .mimeType(sourceResource.getMimeType())
                .position(sourceResource.getPosition())
                .isDownloadable(sourceResource.getIsDownloadable())
                .textContent(sourceResource.getTextContent())
                .metadata(
                    sourceResource.getMetadata() == null
                        ? new HashMap<>()
                        : new HashMap<>(sourceResource.getMetadata()))
                .build());
        resourcesCopied++;
      }
    }

    Map<UUID, UUID> quizMapping = new HashMap<>();
    List<Assignment> sourceAssignments = new ArrayList<>(assignmentRepository.findByCourseId(sourceCourseId));
    sourceAssignments.sort(
        Comparator.comparing(
                Assignment::getModuleId,
                Comparator.nullsFirst(
                    Comparator.comparingInt(
                        id ->
                            sourceModules.stream()
                                .filter(module -> module.getId().equals(id))
                                .map(Module::getPosition)
                                .findFirst()
                                .orElse(0))))
            .thenComparing(Assignment::getPosition));

    for (Assignment sourceAssignment : sourceAssignments) {
      UUID targetQuizId = null;
      if (sourceAssignment.getQuizId() != null) {
        targetQuizId = quizMapping.get(sourceAssignment.getQuizId());
        if (targetQuizId == null) {
          QuizDto clonedQuiz =
              quizService.duplicateQuiz(
                  sourceAssignment.getQuizId(), userId, userRole, targetCourse.getId(), true);
          targetQuizId = clonedQuiz.getId();
          quizMapping.put(sourceAssignment.getQuizId(), targetQuizId);
          quizzesCopied++;
        }
      }

      assignmentRepository.save(
          Assignment.builder()
              .courseId(targetCourse.getId())
              .moduleId(
                  sourceAssignment.getModuleId() == null
                      ? null
                      : moduleMapping.get(sourceAssignment.getModuleId()))
              .categoryId(sourceAssignment.getCategoryId())
              .position(sourceAssignment.getPosition())
              .assignmentType(sourceAssignment.getAssignmentType())
              .title(sourceAssignment.getTitle())
              .description(sourceAssignment.getDescription())
              .descriptionFormat(sourceAssignment.getDescriptionFormat())
              .instructions(sourceAssignment.getInstructions())
              .instructionsFormat(sourceAssignment.getInstructionsFormat())
              .resources(
                  sourceAssignment.getResources() == null
                      ? List.of()
                      : new ArrayList<>(sourceAssignment.getResources()))
              .starterCode(sourceAssignment.getStarterCode())
              .solutionCode(sourceAssignment.getSolutionCode())
              .programmingLanguage(sourceAssignment.getProgrammingLanguage())
              .autoGradingEnabled(sourceAssignment.getAutoGradingEnabled())
              .testCases(
                  sourceAssignment.getTestCases() == null
                      ? List.of()
                      : new ArrayList<>(sourceAssignment.getTestCases()))
              .maxPoints(sourceAssignment.getMaxPoints())
              .rubric(
                  sourceAssignment.getRubric() == null
                      ? Map.of()
                      : new HashMap<>(sourceAssignment.getRubric()))
              .dueDate(copyScheduleDates ? sourceAssignment.getDueDate() : null)
              .availableFrom(copyScheduleDates ? sourceAssignment.getAvailableFrom() : null)
              .availableUntil(copyScheduleDates ? sourceAssignment.getAvailableUntil() : null)
              .allowLateSubmission(sourceAssignment.getAllowLateSubmission())
              .latePenaltyPercent(sourceAssignment.getLatePenaltyPercent())
              .submissionTypes(
                  sourceAssignment.getSubmissionTypes() == null
                      ? List.of()
                      : new ArrayList<>(sourceAssignment.getSubmissionTypes()))
              .allowedFileTypes(
                  sourceAssignment.getAllowedFileTypes() == null
                      ? List.of()
                      : new ArrayList<>(sourceAssignment.getAllowedFileTypes()))
              .maxFileSize(sourceAssignment.getMaxFileSize())
              .maxFiles(sourceAssignment.getMaxFiles())
              .quizId(targetQuizId)
              .externalToolUrl(sourceAssignment.getExternalToolUrl())
              .externalToolConfig(
                  sourceAssignment.getExternalToolConfig() == null
                      ? Map.of()
                      : new HashMap<>(sourceAssignment.getExternalToolConfig()))
              .gradeAnonymously(sourceAssignment.getGradeAnonymously())
              .peerReviewEnabled(sourceAssignment.getPeerReviewEnabled())
              .peerReviewsRequired(sourceAssignment.getPeerReviewsRequired())
              .tags(
                  sourceAssignment.getTags() == null
                      ? List.of()
                      : new ArrayList<>(sourceAssignment.getTags()))
              .estimatedDuration(sourceAssignment.getEstimatedDuration())
              .isTemplate(sourceAssignment.getIsTemplate())
              .isArchived(false)
              .originalAssignmentId(sourceAssignment.getId())
              .isPublished(sourceAssignment.getIsPublished())
              .createdBy(userId)
              .build());
      assignmentsCopied++;
    }

    return new CloneStats(modulesCopied, resourcesCopied, assignmentsCopied, quizzesCopied);
  }

  private void addCourseMember(Course course, UUID userId, String role, UUID addedBy) {
    CourseMember member =
        CourseMember.builder()
            .course(course)
            .userId(userId)
            .roleInCourse(role)
            .addedBy(addedBy)
            .enrollmentStatus(ENROLLMENT_ACTIVE)
            .build();
    courseMemberRepository.save(member);
  }

  private boolean canUserManageCourse(Course course, UUID userId, String userRole) {
    if (ROLE_SUPERADMIN.equalsIgnoreCase(userRole)) {
      return true;
    }
    if (course.getOwnerId().equals(userId)) {
      return true;
    }
    return courseMemberRepository.canUserManageCourse(course.getId(), userId);
  }

  private void validateDateRange(LocalDate startDate, LocalDate endDate) {
    if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
      throw new ValidationException("End date must be after start date");
    }
  }

  private static final class CloneStats {
    private final int modulesCopied;
    private final int resourcesCopied;
    private final int assignmentsCopied;
    private final int quizzesCopied;

    private CloneStats(
        int modulesCopied, int resourcesCopied, int assignmentsCopied, int quizzesCopied) {
      this.modulesCopied = modulesCopied;
      this.resourcesCopied = resourcesCopied;
      this.assignmentsCopied = assignmentsCopied;
      this.quizzesCopied = quizzesCopied;
    }
  }
}
