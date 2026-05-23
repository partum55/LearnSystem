package com.university.lms.course.assignments.service;

import com.university.lms.course.assignments.dto.AssignmentDetailDto;
import com.university.lms.course.assignments.dto.AssignmentRequest;
import com.university.lms.course.assignments.dto.FileAssignmentSettingsDto;
import com.university.lms.course.assignments.dto.FormAssignmentSettingsDto;
import com.university.lms.course.assignments.dto.QuizAssignmentSettingsDto;
import com.university.lms.course.assignments.dto.RteAssignmentSettingsDto;
import com.university.lms.course.assignments.dto.SeminarAssignmentSettingsDto;
import com.university.lms.course.assignments.dto.VplAssignmentSettingsDto;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.AssignmentStatus;
import com.university.lms.course.assessment.domain.AssignmentType;
import com.university.lms.submission.domain.SubmissionStatus;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.domain.Module;
import com.university.lms.course.gradebook.service.CanonicalGradebookService;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.submissions.dto.GradeDraftRequest;
import com.university.lms.course.submissions.dto.SubmissionDto;
import com.university.lms.course.submissions.dto.SubmissionRequest;
import com.university.lms.course.submissions.dto.SubmissionReviewDto;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.domain.SubmissionVersion;
import com.university.lms.submission.repository.SubmissionRepository;
import com.university.lms.submission.repository.SubmissionVersionRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CanonicalAssignmentService {
  private final AssignmentRepository assignmentRepository;
  private final ModuleRepository moduleRepository;
  private final SubmissionRepository submissionRepository;
  private final SubmissionVersionRepository submissionVersionRepository;
  private final GradebookEntryRepository gradebookEntryRepository;
  private final CanonicalAssignmentMapper assignmentMapper;
  private final CanonicalGradebookService gradebookService;
  private final CourseAccessService accessService;

  @Transactional(readOnly = true)
  public AssignmentDetailDto getAssignment(UUID assignmentId, UUID userId) {
    Assignment assignment = requireAssignment(assignmentId);
    requireReadableAssignment(assignment, userId);
    return assignmentMapper.toDetail(
        assignment,
        submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId).orElse(null),
        gradebookEntryRepository.findByAssignmentIdAndStudentId(assignmentId, userId).orElse(null),
        0);
  }

  @Transactional
  public AssignmentDetailDto createAssignment(
      UUID courseId,
      UUID moduleId,
      UUID userId,
      AssignmentRequest request) {
    accessService.requireTeacher(courseId, userId);
    requireModuleInCourse(courseId, moduleId);
    Map<String, Object> settings = settingsFor(request);
    validateAssignmentRequest(request.type(), settings);
    Assignment assignment = Assignment.builder()
        .courseId(courseId)
        .moduleId(moduleId)
        .assignmentType(request.type())
        .title(request.title())
        .description(request.description() == null ? "" : request.description())
        .instructions(request.instructions())
        .maxPoints(request.maxPoints())
        .position(request.order() == null ? nextAssignmentPosition(moduleId) : request.order())
        .dueDate(request.dueDate())
        .status(Boolean.TRUE.equals(request.visible()) ? AssignmentStatus.PUBLISHED : AssignmentStatus.DRAFT)
        .createdBy(userId)
        .settings(assignmentSettings(settings))
        .build();
    assignment = assignmentRepository.save(assignment);
    gradebookService.ensureGradebookEntriesForAssignment(assignment);
    return assignmentMapper.toDetail(assignment, null, null, 0);
  }

  @Transactional
  public AssignmentDetailDto updateAssignment(UUID assignmentId, UUID userId, AssignmentRequest request) {
    Assignment assignment = requireAssignment(assignmentId);
    accessService.requireTeacher(assignment.getCourseId(), userId);
    AssignmentType currentType = assignment.getAssignmentType();
    if (request.type() != null && request.type() != currentType) {
      throw ApiException.conflict(
          "ASSIGNMENT_TYPE_IMMUTABLE",
          "Assignment type cannot be changed after creation");
    }
    Map<String, Object> settings = settingsFor(request);
    validateAssignmentRequest(currentType, settings);
    assignment.setTitle(request.title());
    assignment.setDescription(request.description() == null ? "" : request.description());
    assignment.setInstructions(request.instructions());
    assignment.setMaxPoints(request.maxPoints());
    if (request.order() != null) {
      assignment.setPosition(request.order());
    }
    assignment.setDueDate(request.dueDate());
    if (request.visible() != null) {
      assignment.setStatus(request.visible() ? AssignmentStatus.PUBLISHED : AssignmentStatus.DRAFT);
    }
    assignment.setSettings(assignmentSettings(settings));
    assignment = assignmentRepository.save(assignment);
    gradebookService.ensureGradebookEntriesForAssignment(assignment);
    return assignmentMapper.toDetail(assignment, null, null, 0);
  }

  @Transactional
  public SubmissionDto editSubmission(UUID submissionId, UUID userId, SubmissionRequest request) {
    Submission submission = requireOwnedSubmission(submissionId, userId);
    Assignment assignment = requireAssignment(submission.getAssignmentId());
    accessService.requireStudent(assignment.getCourseId(), userId);
    requireAvailableForStudent(assignment);
    requireMutableSubmission(submission);
    if (!assignment.acceptsLateSubmission()) {
      throw ApiException.conflict("DEADLINE_CLOSED", "The assignment deadline has passed");
    }
    Map<String, Object> settings = assignmentSettingsOf(assignment);
    if (!booleanSetting(settings, "allowEditAfterSubmit", true)) {
      throw ApiException.conflict("SUBMISSION_EDIT_NOT_ALLOWED", "This assignment does not allow editing submissions");
    }
    AssignmentType type = assignment.getAssignmentType();
    if (!type.requiresStudentSubmission()) {
      throw ApiException.conflict("SUBMISSION_NOT_ALLOWED", "This assignment does not accept direct submissions");
    }
    applySubmissionContent(submission, type, request, settings);
    submission.setSubmissionVersion(nextSubmissionVersion(submission));
    submission.setStatus(assignment.isOverdue() ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);
    submission.setIsLate(assignment.isOverdue());
    submission.setLastResubmittedAt(LocalDateTime.now());
    submission.setSubmittedAt(LocalDateTime.now());
    submission = submissionRepository.save(submission);
    saveSubmissionVersion(submission);
    gradebookService.markSubmitted(assignment, submission);
    return toSubmissionDto(submission);
  }

  @Transactional
  public void withdrawSubmission(UUID submissionId, UUID userId) {
    Submission submission = requireOwnedSubmission(submissionId, userId);
    Assignment assignment = requireAssignment(submission.getAssignmentId());
    accessService.requireStudent(assignment.getCourseId(), userId);
    requireAvailableForStudent(assignment);
    requireMutableSubmission(submission);
    Map<String, Object> settings = assignmentSettingsOf(assignment);
    if (!booleanSetting(settings, "allowDeleteAfterSubmit", false)) {
      throw ApiException.conflict("SUBMISSION_DELETE_NOT_ALLOWED", "This assignment does not allow deleting submissions");
    }
    submission.setSubmissionVersion(nextSubmissionVersion(submission));
    submission.setStatus(SubmissionStatus.WITHDRAWN);
    submission.setSubmittedAt(null);
    submission.setTextAnswer(null);
    submission.setSubmissionUrl(null);
    submission.setFormData(null);
    submission.setAutoGradeResult(null);
    submission = submissionRepository.save(submission);
    saveSubmissionVersion(submission);
    gradebookService.markWithdrawn(assignment, submission);
  }

  @Transactional
  public void deleteAssignment(UUID assignmentId, UUID userId) {
    Assignment assignment = requireAssignment(assignmentId);
    accessService.requireTeacher(assignment.getCourseId(), userId);
    assignment.setStatus(AssignmentStatus.ARCHIVED);
    assignmentRepository.save(assignment);
  }

  @Transactional
  public SubmissionDto submit(
      UUID assignmentId,
      UUID userId,
      String expectedType,
      SubmissionRequest request) {
    Assignment assignment = requireAssignment(assignmentId);
    accessService.requireStudent(assignment.getCourseId(), userId);
    requireAvailableForStudent(assignment);
    AssignmentType type = assignment.getAssignmentType();
    if (!expectedType.equals(type.name())) {
      throw ApiException.badRequest(
          "WRONG_SUBMISSION_ENDPOINT", "Use the " + type.name() + " submission endpoint for this assignment");
    }
    if (!type.requiresStudentSubmission()) {
      throw ApiException.conflict("SUBMISSION_NOT_ALLOWED", "This assignment does not accept direct submissions");
    }
    if (!assignment.acceptsLateSubmission()) {
      throw ApiException.conflict("DEADLINE_CLOSED", "The assignment deadline has passed");
    }
    Map<String, Object> settings = assignmentSettingsOf(assignment);
    Submission submission = submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId)
        .orElseGet(() -> Submission.builder()
            .assignmentId(assignmentId)
            .userId(userId)
            .status(SubmissionStatus.DRAFT)
            .submissionVersion(1)
            .build());
    boolean existingSubmission = submission.getId() != null;
    if (submission.getPublishedAt() != null) {
      throw ApiException.conflict("GRADE_ALREADY_PUBLISHED", "Published submissions cannot be changed");
    }
    validateResubmissionAllowed(submission, settings);
    applySubmissionContent(submission, type, request, settings);
    submission.setStatus(assignment.isOverdue() ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);
    submission.setSubmittedAt(LocalDateTime.now());
    submission.setLastResubmittedAt(existingSubmission ? LocalDateTime.now() : null);
    submission.setIsLate(assignment.isOverdue());
    submission.setSubmissionVersion(existingSubmission
        ? (submission.getSubmissionVersion() == null ? 2 : submission.getSubmissionVersion() + 1)
        : 1);
    submission = submissionRepository.save(submission);
    saveSubmissionVersion(submission);
    gradebookService.markSubmitted(assignment, submission);
    return toSubmissionDto(submission);
  }

  @Transactional(readOnly = true)
  public Page<SubmissionDto> listSubmissions(UUID assignmentId, UUID userId, Pageable pageable) {
    Assignment assignment = requireAssignment(assignmentId);
    accessService.requireTeacher(assignment.getCourseId(), userId);
    return submissionRepository.findReviewQueue(assignmentId, null, null, pageable)
        .map(this::toSubmissionDto);
  }

  @Transactional(readOnly = true)
  public SubmissionReviewDto reviewSubmission(UUID submissionId, UUID userId) {
    Submission submission = submissionRepository.findById(submissionId)
        .orElseThrow(() -> ApiException.notFound("Submission"));
    Assignment assignment = requireAssignment(submission.getAssignmentId());
    accessService.requireTeacher(assignment.getCourseId(), userId);
    GradebookEntry entry = gradebookEntryRepository
        .findByAssignmentIdAndStudentId(assignment.getId(), submission.getUserId())
        .orElse(null);
    return new SubmissionReviewDto(
        submission.getId(),
        new SubmissionReviewDto.StudentDto(submission.getUserId(), submission.getUserId().toString(), null),
        assignmentMapper.toDetail(assignment, submission, entry, 0),
        submissionContent(submission),
        entry == null || entry.getDraftScore() == null ? null : new com.university.lms.course.assignments.dto.GradePreviewDto(
            entry.getDraftScore(), assignment.getMaxPoints(), "draft", entry.getDraftComment()),
        entry == null || !entry.isPublishedGrade() || entry.getPublishedFinalScore() == null ? null
            : new com.university.lms.course.assignments.dto.GradePreviewDto(
                entry.getPublishedFinalScore(), assignment.getMaxPoints(), "published", entry.getPublishedFinalComment()),
        Map.of());
  }

  @Transactional
  public SubmissionReviewDto saveDraftGrade(UUID submissionId, UUID userId, GradeDraftRequest request) {
    Submission submission = submissionRepository.findById(submissionId)
        .orElseThrow(() -> ApiException.notFound("Submission"));
    Assignment assignment = requireAssignment(submission.getAssignmentId());
    accessService.requireTeacher(assignment.getCourseId(), userId);
    if (request.points().compareTo(assignment.getMaxPoints()) > 0) {
      throw ApiException.badRequest("GRADE_EXCEEDS_MAX_POINTS", "Grade cannot exceed maxPoints");
    }
    submission.setDraftGrade(request.points());
    submission.setDraftFeedback(request.comment());
    submission.setGraderId(userId);
    submission.setGradedAt(LocalDateTime.now());
    submission.setStatus(SubmissionStatus.IN_REVIEW);
    submissionRepository.save(submission);
    gradebookService.saveDraft(assignment, submission, request.points(), request.comment(), userId);
    return reviewSubmission(submissionId, userId);
  }

  @Transactional
  public void publishGrade(UUID submissionId, UUID userId) {
    Submission submission = submissionRepository.findById(submissionId)
        .orElseThrow(() -> ApiException.notFound("Submission"));
    Assignment assignment = requireAssignment(submission.getAssignmentId());
    accessService.requireTeacher(assignment.getCourseId(), userId);
    GradebookEntry entry = gradebookEntryRepository
        .findByAssignmentIdAndStudentId(assignment.getId(), submission.getUserId())
        .orElse(null);
    if (entry == null || entry.getDraftScore() == null) {
      throw ApiException.conflict("NO_DRAFT_GRADE", "Save a draft grade before publishing");
    }
    submission.setPublishedGrade(entry.getDraftScore());
    submission.setPublishedFeedback(entry.getDraftComment());
    submission.setPublishedBy(userId);
    submission.setPublishedAt(LocalDateTime.now());
    submission.setStatus(SubmissionStatus.PUBLISHED);
    submissionRepository.save(submission);
    gradebookService.publish(assignment, submission, userId);
  }

  private Assignment requireAssignment(UUID assignmentId) {
    return assignmentRepository.findById(assignmentId)
        .filter(a -> a.getStatus() != AssignmentStatus.ARCHIVED)
        .orElseThrow(() -> ApiException.notFound("Assignment"));
  }

  private void requireReadableAssignment(Assignment assignment, UUID userId) {
    accessService.requireCourseAccess(assignment.getCourseId(), userId);
    if (!accessService.canTeach(assignment.getCourseId(), userId)) {
      accessService.requireStudent(assignment.getCourseId(), userId);
      requireAvailableForStudent(assignment);
    }
  }

  private void requireAvailableForStudent(Assignment assignment) {
    if (!assignment.isAvailable()) {
      throw ApiException.forbidden("Assignment is not available");
    }
  }

  private Submission requireOwnedSubmission(UUID submissionId, UUID userId) {
    Submission submission = submissionRepository.findById(submissionId)
        .orElseThrow(() -> ApiException.notFound("Submission"));
    if (!submission.getUserId().equals(userId)) {
      throw ApiException.forbidden("You cannot change another student's submission");
    }
    return submission;
  }

  private void requireMutableSubmission(Submission submission) {
    if (submission.getPublishedAt() != null) {
      throw ApiException.conflict("GRADE_ALREADY_PUBLISHED", "Published submissions cannot be changed");
    }
  }

  private void requireModuleInCourse(UUID courseId, UUID moduleId) {
    Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> ApiException.notFound("Module"));
    if (!module.getCourse().getId().equals(courseId)) {
      throw ApiException.badRequest("MODULE_COURSE_MISMATCH", "Module does not belong to the course");
    }
  }

  private int nextAssignmentPosition(UUID moduleId) {
    return assignmentRepository.findByModuleIdOrderByPositionAsc(moduleId).stream()
        .map(Assignment::getPosition)
        .filter(java.util.Objects::nonNull)
        .max(Integer::compareTo)
        .orElse(0) + 1;
  }

  private Map<String, Object> settingsFor(AssignmentRequest request) {
    if (request.type() == null) {
      throw ApiException.badRequest("INVALID_ASSIGNMENT_TYPE", "Assignment type is required");
    }
    return switch (request.type()) {
      case FILE_SUBMISSION -> fileSettings(request.fileSettings());
      case TEXT_SUBMISSION -> rteSettings(request.rteSettings());
      case FORM -> formSettings(request.formSettings());
      case QUIZ -> quizSettings(request.quizSettings());
      case VPL -> vplSettings(request.vplSettings());
      case SEMINAR -> seminarSettings(request.seminarSettings());
    };
  }

  private Map<String, Object> fileSettings(FileAssignmentSettingsDto settings) {
    Map<String, Object> value = new HashMap<>();
    value.put("allowedFileTypes", settings == null || settings.allowedFileTypes() == null
        ? List.of()
        : settings.allowedFileTypes());
    value.put("maxFiles", settings == null || settings.maxFiles() == null ? 5 : settings.maxFiles());
    value.put("maxFileSizeMb", settings == null || settings.maxFileSizeMb() == null ? 10 : settings.maxFileSizeMb());
    value.put("allowEditAfterSubmit", settings == null || !Boolean.FALSE.equals(settings.allowEditAfterSubmit()));
    value.put("allowDeleteAfterSubmit", settings != null && Boolean.TRUE.equals(settings.allowDeleteAfterSubmit()));
    value.put("allowResubmission", settings == null || !Boolean.FALSE.equals(settings.allowResubmission()));
    return value;
  }

  private Map<String, Object> rteSettings(RteAssignmentSettingsDto settings) {
    Map<String, Object> value = new HashMap<>();
    value.put("minWords", settings == null ? null : settings.minWords());
    value.put("maxWords", settings == null ? null : settings.maxWords());
    value.put("allowEditAfterSubmit", settings == null || !Boolean.FALSE.equals(settings.allowEditAfterSubmit()));
    value.put("allowResubmission", settings == null || !Boolean.FALSE.equals(settings.allowResubmission()));
    return value;
  }

  private Map<String, Object> formSettings(FormAssignmentSettingsDto settings) {
    Map<String, Object> value = new HashMap<>();
    value.put("fields", settings == null || settings.fields() == null ? List.of() : settings.fields());
    value.put("allowEditAfterSubmit", settings == null || !Boolean.FALSE.equals(settings.allowEditAfterSubmit()));
    value.put("allowResubmission", settings == null || !Boolean.FALSE.equals(settings.allowResubmission()));
    return value;
  }

  private Map<String, Object> quizSettings(QuizAssignmentSettingsDto settings) {
    Map<String, Object> value = new HashMap<>();
    value.put("attemptLimit", settings == null || settings.attemptLimit() == null ? 1 : settings.attemptLimit());
    value.put("timeLimitMinutes", settings == null ? null : settings.timeLimitMinutes());
    value.put("canReviewAttempts", settings == null || !Boolean.FALSE.equals(settings.canReviewAttempts()));
    value.put("showCorrectAnswers", settings != null && Boolean.TRUE.equals(settings.showCorrectAnswers()));
    value.put("showScoreAfterSubmit", settings == null || !Boolean.FALSE.equals(settings.showScoreAfterSubmit()));
    value.put("shuffleQuestions", settings != null && Boolean.TRUE.equals(settings.shuffleQuestions()));
    value.put("gradingMode", settings == null || settings.gradingMode() == null ? "auto" : settings.gradingMode());
    return value;
  }

  private Map<String, Object> vplSettings(VplAssignmentSettingsDto settings) {
    Map<String, Object> value = new HashMap<>();
    value.put("language", settings == null ? null : settings.language());
    value.put("runtime", settings == null ? null : settings.runtime());
    value.put("templateCode", settings == null ? null : settings.templateCode());
    value.put("visibleTests", settings == null || settings.visibleTests() == null ? List.of() : settings.visibleTests());
    value.put("hiddenTestsReference", settings == null ? null : settings.hiddenTestsReference());
    value.put("timeLimit", settings == null ? null : settings.timeLimit());
    value.put("memoryLimit", settings == null ? null : settings.memoryLimit());
    value.put("gradingMode", settings == null || settings.gradingMode() == null ? "manual" : settings.gradingMode());
    return value;
  }

  private Map<String, Object> seminarSettings(SeminarAssignmentSettingsDto settings) {
    Map<String, Object> value = new HashMap<>();
    value.put("requiresSubmission", false);
    value.put("manualGradeOnly", settings == null || !Boolean.FALSE.equals(settings.manualGradeOnly()));
    return value;
  }

  private void validateAssignmentRequest(AssignmentType type, Map<String, Object> settings) {
    if (type == AssignmentType.FILE_SUBMISSION) {
      if (intSetting(settings, "maxFiles", 1) < 1) {
        throw ApiException.badRequest("INVALID_FILE_SETTINGS", "maxFiles must be at least 1");
      }
      if (intSetting(settings, "maxFileSizeMb", 1) < 1) {
        throw ApiException.badRequest("INVALID_FILE_SETTINGS", "maxFileSizeMb must be at least 1");
      }
    }
    if (type == AssignmentType.VPL && isBlank((String) settings.get("language"))) {
      throw ApiException.badRequest("VPL_LANGUAGE_REQUIRED", "VPL assignments require a language");
    }
    if (type == AssignmentType.QUIZ && intSetting(settings, "attemptLimit", 1) < 1) {
      throw ApiException.badRequest("QUIZ_ATTEMPT_LIMIT_REQUIRED", "Quiz attemptLimit must be at least 1");
    }
    if (type == AssignmentType.QUIZ && integerSetting(settings, "timeLimitMinutes") != null
        && integerSetting(settings, "timeLimitMinutes") < 1) {
      throw ApiException.badRequest("QUIZ_TIME_LIMIT_INVALID", "Quiz timeLimitMinutes must be at least 1 when set");
    }
    if (type == AssignmentType.TEXT_SUBMISSION) {
      Integer minWords = integerSetting(settings, "minWords");
      Integer maxWords = integerSetting(settings, "maxWords");
      if (minWords != null && maxWords != null && minWords > maxWords) {
        throw ApiException.badRequest("INVALID_WORD_LIMITS", "minWords cannot be greater than maxWords");
      }
    }
    if (type == AssignmentType.FORM) {
      Object fields = settings.get("fields");
      if (fields != null && !(fields instanceof List<?>)) {
        throw ApiException.badRequest("INVALID_FORM_SETTINGS", "Form fields must be a list");
      }
    }
    if (type == AssignmentType.SEMINAR && Boolean.TRUE.equals(settings.get("requiresSubmission"))) {
      throw ApiException.badRequest("INVALID_SEMINAR_SETTINGS", "Seminar assignments cannot require submissions");
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> assignmentSettingsOf(Assignment assignment) {
    Map<String, Object> settings = assignment.getSettings() == null ? Map.of() : assignment.getSettings();
    return settings;
  }

  private Map<String, Object> assignmentSettings(Map<String, Object> settings) {
    Map<String, Object> canonical = new HashMap<>(settings == null ? Map.of() : settings);
    canonical.put("schemaVersion", 1);
    return canonical;
  }

  @SuppressWarnings("unchecked")
  private int intSetting(Map<String, Object> settings, String key, int defaultValue) {
    Object value = settings.get(key);
    if (value instanceof Number number) {
      return number.intValue();
    }
    return defaultValue;
  }

  private Integer integerSetting(Map<String, Object> settings, String key) {
    Object value = settings.get(key);
    return value instanceof Number number ? number.intValue() : null;
  }

  private boolean booleanSetting(Map<String, Object> settings, String key, boolean defaultValue) {
    Object value = settings.get(key);
    return value instanceof Boolean bool ? bool : defaultValue;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private void validateResubmissionAllowed(Submission submission, Map<String, Object> settings) {
    if (submission.getId() == null || submission.getSubmittedAt() == null) {
      return;
    }
    if (!booleanSetting(settings, "allowResubmission", true)) {
      throw ApiException.conflict("RESUBMISSION_NOT_ALLOWED", "This assignment does not allow resubmission");
    }
  }

  private void applySubmissionContent(
      Submission submission,
      AssignmentType type,
      SubmissionRequest request,
      Map<String, Object> settings) {
    switch (type) {
      case FILE_SUBMISSION -> {
        if (request.files() == null || request.files().isEmpty()) {
          throw ApiException.badRequest("FILES_REQUIRED", "At least one file is required");
        }
        int maxFiles = intSetting(settings, "maxFiles", 5);
        if (request.files().size() > maxFiles) {
          throw ApiException.badRequest("TOO_MANY_FILES", "Submitted file count exceeds maxFiles");
        }
        long maxFileSizeBytes = (long) intSetting(settings, "maxFileSizeMb", 10) * 1024L * 1024L;
        @SuppressWarnings("unchecked")
        List<String> allowedFileTypes = (List<String>) settings.getOrDefault("allowedFileTypes", List.of());
        for (SubmissionRequest.FileSubmissionItemDto file : request.files()) {
          if (file.fileSize() != null && file.fileSize() > maxFileSizeBytes) {
            throw ApiException.badRequest("FILE_TOO_LARGE", "One or more files exceed maxFileSizeMb");
          }
          if (!allowedFileTypes.isEmpty() && !allowedFileTypes.contains(file.contentType())) {
            throw ApiException.badRequest("FILE_TYPE_NOT_ALLOWED", "One or more files use a disallowed content type");
          }
        }
        submission.setFormData(Map.of("files", request.files()));
      }
      case TEXT_SUBMISSION -> {
        if (request.text() == null || request.text().isBlank()) {
          throw ApiException.badRequest("TEXT_REQUIRED", "Submission text is required");
        }
        int words = wordCount(request.text());
        Integer minWords = integerSetting(settings, "minWords");
        Integer maxWords = integerSetting(settings, "maxWords");
        if (minWords != null && words < minWords) {
          throw ApiException.badRequest("TEXT_TOO_SHORT", "Submission text is below minWords");
        }
        if (maxWords != null && words > maxWords) {
          throw ApiException.badRequest("TEXT_TOO_LONG", "Submission text exceeds maxWords");
        }
        submission.setTextAnswer(request.text());
      }
      case FORM -> {
        if (request.answers() == null) {
          throw ApiException.badRequest("FORM_ANSWERS_REQUIRED", "Form answers are required");
        }
        validateFormAnswers(settings, request.answers());
        submission.setFormData(request.answers());
      }
      case VPL -> {
        if (isBlank(request.programmingLanguage())) {
          throw ApiException.badRequest("PROGRAMMING_LANGUAGE_REQUIRED", "Programming language is required");
        }
        if (isBlank(request.code())) {
          throw ApiException.badRequest("CODE_REQUIRED", "Code is required");
        }
        String configuredLanguage = (String) settings.get("language");
        if (!isBlank(configuredLanguage) && !configuredLanguage.equalsIgnoreCase(request.programmingLanguage())) {
          throw ApiException.badRequest("PROGRAMMING_LANGUAGE_MISMATCH", "Submission language does not match assignment language");
        }
        submission.setTextAnswer(request.code());
        submission.setAutoGradeResult(Map.of(
            "executionStatus", "pending",
            "vplBoundary", "vpl-service",
            "executionResultReference", Objects.toString(request.executionResultReference(), null)));
      }
      default -> throw ApiException.badRequest("INVALID_SUBMISSION_TYPE", "Unsupported submission type");
    }
  }

  private int wordCount(String text) {
    String trimmed = text == null ? "" : text.trim();
    return trimmed.isEmpty() ? 0 : trimmed.split("\\s+").length;
  }

  @SuppressWarnings("unchecked")
  private void validateFormAnswers(Map<String, Object> settings, Map<String, Object> answers) {
    Object fieldsValue = settings.get("fields");
    if (!(fieldsValue instanceof List<?> fields)) {
      return;
    }
    List<String> missing = new ArrayList<>();
    for (Object fieldValue : fields) {
      if (!(fieldValue instanceof Map<?, ?> field)) {
        continue;
      }
      Object required = field.get("required");
      Object name = field.get("name");
      Object id = field.get("id");
      String key = Objects.toString(name == null ? id : name, "");
      if (Boolean.TRUE.equals(required) && (key.isBlank() || !answers.containsKey(key) || answers.get(key) == null)) {
        missing.add(key);
      }
    }
    if (!missing.isEmpty()) {
      throw ApiException.badRequest("REQUIRED_FORM_FIELDS_MISSING", "Required form fields are missing: " + missing);
    }
  }

  private Map<String, Object> submissionContent(Submission submission) {
    Map<String, Object> content = new HashMap<>();
    content.put("text", submission.getTextAnswer());
    content.put("url", submission.getSubmissionUrl());
    content.put("formAnswers", submission.getFormData());
    content.put("autoGradeResult", submission.getAutoGradeResult());
    content.put("files", submission.getFormData() == null ? null : submission.getFormData().get("files"));
    return content;
  }

  private int nextSubmissionVersion(Submission submission) {
    return submission.getSubmissionVersion() == null ? 1 : submission.getSubmissionVersion() + 1;
  }

  private void saveSubmissionVersion(Submission submission) {
    submissionVersionRepository.save(SubmissionVersion.builder()
        .submissionId(submission.getId())
        .assignmentId(submission.getAssignmentId())
        .userId(submission.getUserId())
        .versionNumber(submission.getSubmissionVersion())
        .status(submission.getStatus())
        .content(submissionContent(submission))
        .submittedAt(submission.getSubmittedAt())
        .build());
  }

  private SubmissionDto toSubmissionDto(Submission submission) {
    return new SubmissionDto(
        submission.getId(),
        submission.getAssignmentId(),
        submission.getUserId(),
        submission.getStatus().name(),
        submission.getSubmittedAt(),
        submission.getSubmissionVersion() == null ? 1 : submission.getSubmissionVersion());
  }
}
