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
import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.domain.QuizAttempt;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.QuizAttemptRepository;
import com.university.lms.course.assessment.repository.QuizRepository;
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
import com.university.lms.submission.domain.SubmissionFile;
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
  private final QuizRepository quizRepository;
  private final QuizAttemptRepository quizAttemptRepository;
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
        findQuiz(assignment),
        submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId).orElse(null),
        latestAttempt(assignment, userId),
        gradebookEntryRepository.findByAssignmentIdAndStudentId(assignmentId, userId).orElse(null),
        countAttempts(assignment, userId));
  }

  @Transactional
  public AssignmentDetailDto createAssignment(
      UUID courseId,
      UUID moduleId,
      UUID userId,
      AssignmentRequest request) {
    accessService.requireTeacher(courseId, userId);
    requireModuleInCourse(courseId, moduleId);
    String legacyType = AssignmentTypeMapper.toLegacy(request.type());
    Map<String, Object> settings = settingsFor(request);
    validateAssignmentRequest(request.type(), settings);
    Assignment assignment = Assignment.builder()
        .courseId(courseId)
        .moduleId(moduleId)
        .assignmentType(legacyType)
        .title(request.title())
        .description(request.description() == null ? "" : request.description())
        .instructions(request.instructions())
        .maxPoints(request.maxPoints())
        .position(request.order() == null ? nextAssignmentPosition(moduleId) : request.order())
        .dueDate(request.dueDate())
        .isPublished(Boolean.TRUE.equals(request.visible()))
        .createdBy(userId)
        .externalToolConfig(canonicalSettings(settings))
        .build();
    applySettings(assignment, request.type(), settings);
    assignment = assignmentRepository.save(assignment);
    if ("quiz".equalsIgnoreCase(request.type())) {
      Quiz quiz = createQuizForAssignment(courseId, userId, assignment, settings);
      assignment.setQuizId(quiz.getId());
      assignment = assignmentRepository.save(assignment);
    }
    gradebookService.ensureGradebookEntriesForAssignment(assignment);
    return assignmentMapper.toDetail(assignment, findQuiz(assignment), null, null, null, 0);
  }

  @Transactional
  public AssignmentDetailDto updateAssignment(UUID assignmentId, UUID userId, AssignmentRequest request) {
    Assignment assignment = requireAssignment(assignmentId);
    accessService.requireTeacher(assignment.getCourseId(), userId);
    String currentType = AssignmentTypeMapper.toCanonical(assignment.getAssignmentType());
    if (request.type() != null && !currentType.equalsIgnoreCase(request.type())) {
      throw ApiException.conflict(
          "ASSIGNMENT_TYPE_IMMUTABLE",
          "Assignment type cannot be changed after creation");
    }
    Map<String, Object> settings = settingsFor(request);
    validateAssignmentRequest(currentType, settings);
    assignment.setAssignmentType(AssignmentTypeMapper.toLegacy(currentType));
    assignment.setTitle(request.title());
    assignment.setDescription(request.description() == null ? "" : request.description());
    assignment.setInstructions(request.instructions());
    assignment.setMaxPoints(request.maxPoints());
    if (request.order() != null) {
      assignment.setPosition(request.order());
    }
    assignment.setDueDate(request.dueDate());
    if (request.visible() != null) {
      assignment.setIsPublished(request.visible());
    }
    assignment.setExternalToolConfig(canonicalSettings(settings));
    applySettings(assignment, currentType, settings);
    assignment = assignmentRepository.save(assignment);
    updateQuizForAssignment(assignment, settings);
    gradebookService.ensureGradebookEntriesForAssignment(assignment);
    return assignmentMapper.toDetail(assignment, findQuiz(assignment), null, null, null, 0);
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
    Map<String, Object> settings = canonicalSettingsOf(assignment);
    if (!booleanSetting(settings, "allowEditAfterSubmit", true)) {
      throw ApiException.conflict("SUBMISSION_EDIT_NOT_ALLOWED", "This assignment does not allow editing submissions");
    }
    String type = AssignmentTypeMapper.toCanonical(assignment.getAssignmentType());
    if (!AssignmentTypeMapper.requiresStudentSubmission(type)) {
      throw ApiException.conflict("SUBMISSION_NOT_ALLOWED", "This assignment does not accept direct submissions");
    }
    applySubmissionContent(submission, type, request, assignment, settings);
    submission.setSubmissionVersion(nextSubmissionVersion(submission));
    submission.setStatus(assignment.isOverdue() ? "LATE" : "SUBMITTED");
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
    Map<String, Object> settings = canonicalSettingsOf(assignment);
    if (!booleanSetting(settings, "allowDeleteAfterSubmit", false)) {
      throw ApiException.conflict("SUBMISSION_DELETE_NOT_ALLOWED", "This assignment does not allow deleting submissions");
    }
    submission.setSubmissionVersion(nextSubmissionVersion(submission));
    submission.setStatus("WITHDRAWN");
    submission.setSubmittedAt(null);
    submission.setTextAnswer(null);
    submission.setSubmissionUrl(null);
    submission.setFormData(null);
    submission.setProgrammingLanguage(null);
    submission.setAutoGradeResult(null);
    submission.getFiles().clear();
    submission = submissionRepository.save(submission);
    saveSubmissionVersion(submission);
    gradebookService.markWithdrawn(assignment, submission);
  }

  @Transactional
  public void deleteAssignment(UUID assignmentId, UUID userId) {
    Assignment assignment = requireAssignment(assignmentId);
    accessService.requireTeacher(assignment.getCourseId(), userId);
    assignment.setIsArchived(true);
    assignment.setIsPublished(false);
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
    String type = AssignmentTypeMapper.toCanonical(assignment.getAssignmentType());
    if (!expectedType.equals(type)) {
      throw ApiException.badRequest(
          "WRONG_SUBMISSION_ENDPOINT", "Use the " + type + " submission endpoint for this assignment");
    }
    if (!AssignmentTypeMapper.requiresStudentSubmission(type)) {
      throw ApiException.conflict("SUBMISSION_NOT_ALLOWED", "This assignment does not accept direct submissions");
    }
    if (!assignment.acceptsLateSubmission()) {
      throw ApiException.conflict("DEADLINE_CLOSED", "The assignment deadline has passed");
    }
    Map<String, Object> settings = canonicalSettingsOf(assignment);
    Submission submission = submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId)
        .orElseGet(() -> Submission.builder()
            .assignmentId(assignmentId)
            .userId(userId)
            .status("DRAFT")
            .submissionVersion(1)
            .build());
    boolean existingSubmission = submission.getId() != null;
    if (submission.getPublishedAt() != null) {
      throw ApiException.conflict("GRADE_ALREADY_PUBLISHED", "Published submissions cannot be changed");
    }
    validateResubmissionAllowed(submission, settings);
    applySubmissionContent(submission, type, request, assignment, settings);
    submission.setStatus(assignment.isOverdue() ? "LATE" : "SUBMITTED");
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
        new SubmissionReviewDto.StudentDto(
            submission.getUserId(),
            submission.getStudentName(),
            submission.getStudentEmail()),
        assignmentMapper.toDetail(assignment, findQuiz(assignment), submission, null, entry, 0),
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
    submission.setStatus("IN_REVIEW");
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
    submission.setStatus("PUBLISHED");
    submissionRepository.save(submission);
    gradebookService.publish(assignment, submission, userId);
  }

  private Assignment requireAssignment(UUID assignmentId) {
    return assignmentRepository.findById(assignmentId)
        .filter(a -> !Boolean.TRUE.equals(a.getIsArchived()))
        .orElseThrow(() -> ApiException.notFound("Assignment"));
  }

  private void requireReadableAssignment(Assignment assignment, UUID userId) {
    accessService.requireActiveMember(assignment.getCourseId(), userId);
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
    String type = request.type() == null ? "" : request.type().toLowerCase();
    return switch (type) {
      case "file_submission" -> fileSettings(request.fileSettings());
      case "rte_submission" -> rteSettings(request.rteSettings());
      case "form" -> formSettings(request.formSettings());
      case "quiz" -> quizSettings(request.quizSettings());
      case "vpl" -> vplSettings(request.vplSettings());
      case "seminar" -> seminarSettings(request.seminarSettings());
      default -> throw ApiException.badRequest("INVALID_ASSIGNMENT_TYPE", "Unsupported assignment type");
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

  private void validateAssignmentRequest(String type, Map<String, Object> settings) {
    if ("file_submission".equalsIgnoreCase(type)) {
      if (intSetting(settings, "maxFiles", 1) < 1) {
        throw ApiException.badRequest("INVALID_FILE_SETTINGS", "maxFiles must be at least 1");
      }
      if (intSetting(settings, "maxFileSizeMb", 1) < 1) {
        throw ApiException.badRequest("INVALID_FILE_SETTINGS", "maxFileSizeMb must be at least 1");
      }
    }
    if ("vpl".equalsIgnoreCase(type) && isBlank((String) settings.get("language"))) {
      throw ApiException.badRequest("VPL_LANGUAGE_REQUIRED", "VPL assignments require a language");
    }
    if ("quiz".equalsIgnoreCase(type) && intSetting(settings, "attemptLimit", 1) < 1) {
      throw ApiException.badRequest("QUIZ_ATTEMPT_LIMIT_REQUIRED", "Quiz attemptLimit must be at least 1");
    }
    if ("quiz".equalsIgnoreCase(type) && integerSetting(settings, "timeLimitMinutes") != null
        && integerSetting(settings, "timeLimitMinutes") < 1) {
      throw ApiException.badRequest("QUIZ_TIME_LIMIT_INVALID", "Quiz timeLimitMinutes must be at least 1 when set");
    }
    if ("rte_submission".equalsIgnoreCase(type)) {
      Integer minWords = integerSetting(settings, "minWords");
      Integer maxWords = integerSetting(settings, "maxWords");
      if (minWords != null && maxWords != null && minWords > maxWords) {
        throw ApiException.badRequest("INVALID_WORD_LIMITS", "minWords cannot be greater than maxWords");
      }
    }
    if ("form".equalsIgnoreCase(type)) {
      Object fields = settings.get("fields");
      if (fields != null && !(fields instanceof List<?>)) {
        throw ApiException.badRequest("INVALID_FORM_SETTINGS", "Form fields must be a list");
      }
    }
    if ("seminar".equalsIgnoreCase(type) && Boolean.TRUE.equals(settings.get("requiresSubmission"))) {
      throw ApiException.badRequest("INVALID_SEMINAR_SETTINGS", "Seminar assignments cannot require submissions");
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> canonicalSettingsOf(Assignment assignment) {
    Map<String, Object> config = assignment.getExternalToolConfig() == null
        ? Map.of()
        : assignment.getExternalToolConfig();
    Object settings = config.get("canonicalSettings");
    return settings instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
  }

  private Map<String, Object> canonicalSettings(Map<String, Object> settings) {
    Map<String, Object> config = new HashMap<>();
    Map<String, Object> canonical = new HashMap<>(settings == null ? Map.of() : settings);
    canonical.put("schemaVersion", 1);
    config.put("canonicalSettings", canonical);
    return config;
  }

  @SuppressWarnings("unchecked")
  private void applySettings(Assignment assignment, String canonicalType, Map<String, Object> settings) {
    Map<String, Object> value = settings == null ? Map.of() : settings;
    switch (canonicalType.toLowerCase()) {
      case "file_submission" -> {
        assignment.setAllowedFileTypes((List<String>) value.getOrDefault("allowedFileTypes", List.of()));
        assignment.setMaxFiles(intSetting(value, "maxFiles", 5));
        assignment.setMaxFileSize((long) intSetting(value, "maxFileSizeMb", 10) * 1024L * 1024L);
        assignment.setSubmissionTypes(List.of("FILE"));
      }
      case "rte_submission" -> assignment.setSubmissionTypes(List.of("RTE"));
      case "form" -> assignment.setSubmissionTypes(List.of("FORM"));
      case "vpl" -> {
        assignment.setProgrammingLanguage((String) value.get("language"));
        assignment.setStarterCode((String) value.get("templateCode"));
        assignment.setVplConfig(value);
        assignment.setSubmissionTypes(List.of("VPL"));
        assignment.setAutoGradingEnabled("auto".equals(value.get("gradingMode")));
      }
      case "seminar" -> assignment.setSubmissionTypes(List.of());
      case "quiz" -> assignment.setSubmissionTypes(List.of("QUIZ"));
      default -> {
      }
    }
  }

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

  private Quiz createQuizForAssignment(
      UUID courseId,
      UUID userId,
      Assignment assignment,
      Map<String, Object> settings) {
    Map<String, Object> value = settings == null ? Map.of() : settings;
    return quizRepository.save(Quiz.builder()
        .courseId(courseId)
        .title(assignment.getTitle())
        .description(assignment.getDescription())
        .attemptsAllowed(intSetting(value, "attemptLimit", 1))
        .timeLimit(intSetting(value, "timeLimitMinutes", 0) == 0 ? null : intSetting(value, "timeLimitMinutes", 0))
        .timerEnabled(value.containsKey("timeLimitMinutes"))
        .showCorrectAnswers(Boolean.TRUE.equals(value.get("showCorrectAnswers")))
        .shuffleQuestions(Boolean.TRUE.equals(value.get("shuffleQuestions")))
        .createdBy(userId)
        .build());
  }

  private void updateQuizForAssignment(Assignment assignment, Map<String, Object> settings) {
    if (assignment.getQuizId() == null || !"QUIZ".equalsIgnoreCase(assignment.getAssignmentType())) {
      return;
    }
    Quiz quiz = quizRepository.findById(assignment.getQuizId()).orElse(null);
    if (quiz == null) {
      return;
    }
    Map<String, Object> value = settings == null ? Map.of() : settings;
    quiz.setTitle(assignment.getTitle());
    quiz.setDescription(assignment.getDescription());
    quiz.setAttemptsAllowed(intSetting(value, "attemptLimit", 1));
    int timeLimit = intSetting(value, "timeLimitMinutes", 0);
    quiz.setTimeLimit(timeLimit == 0 ? null : timeLimit);
    quiz.setTimerEnabled(value.containsKey("timeLimitMinutes") && timeLimit > 0);
    quiz.setShowCorrectAnswers(Boolean.TRUE.equals(value.get("showCorrectAnswers")));
    quiz.setShuffleQuestions(Boolean.TRUE.equals(value.get("shuffleQuestions")));
    quizRepository.save(quiz);
  }

  private Quiz findQuiz(Assignment assignment) {
    if (assignment.getQuizId() == null) {
      return null;
    }
    return quizRepository.findById(assignment.getQuizId()).orElse(null);
  }

  private QuizAttempt latestAttempt(Assignment assignment, UUID userId) {
    if (assignment.getQuizId() == null) {
      return null;
    }
    return quizAttemptRepository.findFirstByQuizIdAndUserIdOrderByAttemptNumberDesc(
        assignment.getQuizId(), userId).orElse(null);
  }

  private long countAttempts(Assignment assignment, UUID userId) {
    if (assignment.getQuizId() == null) {
      return 0;
    }
    return quizAttemptRepository.countByQuizIdAndUserId(assignment.getQuizId(), userId);
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
      String type,
      SubmissionRequest request,
      Assignment assignment,
      Map<String, Object> settings) {
    submission.getFiles().clear();
    switch (type) {
      case "file_submission" -> {
        if (request.files() == null || request.files().isEmpty()) {
          throw ApiException.badRequest("FILES_REQUIRED", "At least one file is required");
        }
        int maxFiles = intSetting(settings, "maxFiles", assignment.getMaxFiles() == null ? 5 : assignment.getMaxFiles());
        if (request.files().size() > maxFiles) {
          throw ApiException.badRequest("TOO_MANY_FILES", "Submitted file count exceeds maxFiles");
        }
        long maxFileSize = assignment.getMaxFileSize() == null ? Long.MAX_VALUE : assignment.getMaxFileSize();
        List<String> allowedFileTypes = assignment.getAllowedFileTypes() == null
            ? List.of()
            : assignment.getAllowedFileTypes();
        for (SubmissionRequest.FileSubmissionItemDto file : request.files()) {
          if (file.fileSize() != null && file.fileSize() > maxFileSize) {
            throw ApiException.badRequest("FILE_TOO_LARGE", "One or more files exceed maxFileSizeMb");
          }
          if (!allowedFileTypes.isEmpty() && !allowedFileTypes.contains(file.contentType())) {
            throw ApiException.badRequest("FILE_TYPE_NOT_ALLOWED", "One or more files use a disallowed content type");
          }
          submission.getFiles().add(SubmissionFile.builder()
              .submission(submission)
              .filename(file.fileName())
              .fileUrl(file.fileUrl())
              .storagePath(file.fileUrl())
              .contentType(file.contentType())
              .fileSize(file.fileSize() == null ? 0L : file.fileSize())
              .build());
        }
      }
      case "rte_submission" -> {
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
      case "form" -> {
        if (request.answers() == null) {
          throw ApiException.badRequest("FORM_ANSWERS_REQUIRED", "Form answers are required");
        }
        validateFormAnswers(settings, request.answers());
        submission.setFormData(request.answers());
      }
      case "vpl" -> {
        if (isBlank(request.programmingLanguage())) {
          throw ApiException.badRequest("PROGRAMMING_LANGUAGE_REQUIRED", "Programming language is required");
        }
        if (isBlank(request.code())) {
          throw ApiException.badRequest("CODE_REQUIRED", "Code is required");
        }
        String configuredLanguage = assignment.getProgrammingLanguage();
        if (!isBlank(configuredLanguage) && !configuredLanguage.equalsIgnoreCase(request.programmingLanguage())) {
          throw ApiException.badRequest("PROGRAMMING_LANGUAGE_MISMATCH", "Submission language does not match assignment language");
        }
        submission.setProgrammingLanguage(request.programmingLanguage());
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
    content.put("programmingLanguage", submission.getProgrammingLanguage());
    content.put("autoGradeResult", submission.getAutoGradeResult());
    content.put("files", submission.getFiles().stream()
        .map(file -> {
          Map<String, Object> item = new HashMap<>();
          item.put("id", file.getId());
          item.put("fileName", file.getFilename());
          item.put("fileUrl", file.getFileUrl());
          item.put("contentType", file.getContentType());
          item.put("fileSize", file.getFileSize());
          return item;
        })
        .toList());
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
        submission.getStatus().toLowerCase(),
        submission.getSubmittedAt(),
        submission.getSubmissionVersion() == null ? 1 : submission.getSubmissionVersion());
  }
}
