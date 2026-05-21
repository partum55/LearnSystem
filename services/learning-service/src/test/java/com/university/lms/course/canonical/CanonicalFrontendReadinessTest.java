package com.university.lms.course.canonical;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.course.assignments.dto.FileAssignmentSettingsDto;
import com.university.lms.course.assignments.dto.QuizAssignmentSettingsDto;
import com.university.lms.course.assignments.dto.AssignmentListItemDto;
import com.university.lms.course.assignments.dto.AssignmentRequest;
import com.university.lms.course.assignments.service.CanonicalAssignmentMapper;
import com.university.lms.course.assignments.service.CanonicalAssignmentService;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.domain.QuestionBank;
import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.domain.QuizAttempt;
import com.university.lms.course.assessment.domain.QuizQuestion;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.QuizAttemptRepository;
import com.university.lms.course.assessment.repository.QuizRepository;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.courses.service.CanonicalCourseService;
import com.university.lms.course.domain.Course;
import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.Module;
import com.university.lms.course.gradebook.dto.StudentGradebookDto;
import com.university.lms.course.gradebook.dto.TeacherGradebookDto;
import com.university.lms.course.gradebook.service.CanonicalGradebookService;
import com.university.lms.course.gradebook.service.UserProfileClient;
import com.university.lms.course.materials.service.LearningContentService;
import com.university.lms.course.quizzes.dto.QuizAttemptActiveDto;
import com.university.lms.course.quizzes.dto.QuizQuestionActiveDto;
import com.university.lms.course.quizzes.dto.QuizAttemptReviewDto;
import com.university.lms.course.quizzes.dto.QuizAttemptSubmitRequest;
import com.university.lms.course.quizzes.service.CanonicalQuizAttemptService;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.course.repository.ModuleRepository;
import com.university.lms.course.service.CourseService;
import com.university.lms.course.submissions.dto.SubmissionRequest;
import com.university.lms.gradebook.domain.GradeStatus;
import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.repository.GradebookEntryRepository;
import com.university.lms.submission.repository.SubmissionRepository;
import com.university.lms.submission.repository.SubmissionVersionRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.domain.SubmissionVersion;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.AdditionalAnswers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CanonicalFrontendReadinessTest {
  @Mock private CourseRepository courseRepository;
  @Mock private CourseMemberRepository courseMemberRepository;
  @Mock private ModuleRepository moduleRepository;
  @Mock private AssignmentRepository assignmentRepository;
  @Mock private GradebookEntryRepository gradebookEntryRepository;
  @Mock private LearningContentService learningContentService;
  @Mock private CanonicalAssignmentMapper assignmentMapper;
  @Mock private SubmissionRepository submissionRepository;
  @Mock private SubmissionVersionRepository submissionVersionRepository;
  @Mock private QuizRepository quizRepository;
  @Mock private QuizAttemptRepository quizAttemptRepository;
  @Mock private CourseAccessService accessService;
  @Mock private UserProfileClient userProfileClient;
  @Mock private CourseService legacyCourseService;

  @Test
  void studentModulesHideUnavailableModulesAndHiddenAssignments() {
    UUID courseId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    Course course = course(courseId);
    Module hiddenModule = module(UUID.randomUUID(), course, false);
    Module visibleModule = module(UUID.randomUUID(), course, true);
    Assignment hiddenAssignment = assignment(UUID.randomUUID(), courseId, visibleModule.getId(), "FILE_UPLOAD", false);
    Assignment visibleAssignment = assignment(UUID.randomUUID(), courseId, visibleModule.getId(), "FILE_UPLOAD", true);

    when(moduleRepository.findByCourseIdOrderByPositionAsc(courseId)).thenReturn(List.of(hiddenModule, visibleModule));
    when(gradebookEntryRepository.findByCourseIdAndStudentId(courseId, studentId)).thenReturn(List.of());
    when(accessService.canTeach(courseId, studentId)).thenReturn(false);
    when(learningContentService.listModuleLearningItems(courseId, visibleModule.getId(), studentId)).thenReturn(List.of());
    when(assignmentRepository.findByModuleIdOrderByPositionAsc(visibleModule.getId()))
        .thenReturn(List.of(hiddenAssignment, visibleAssignment));
    when(assignmentMapper.toListItem(visibleAssignment, null))
        .thenReturn(new AssignmentListItemDto(
            visibleAssignment.getId(),
            visibleModule.getId(),
            "Visible",
            "file_submission",
            1,
            BigDecimal.TEN,
            null,
            "visible",
            null));

    var service = courseService();
    var response = service.modules(courseId, studentId);

    assertThat(response.items()).hasSize(1);
    assertThat(response.items().getFirst().id()).isEqualTo(visibleModule.getId());
    assertThat(response.items().getFirst().assignments()).extracting(AssignmentListItemDto::id)
        .containsExactly(visibleAssignment.getId());
    verify(assignmentMapper, never()).toListItem(hiddenAssignment, null);
  }

  @Test
  void teacherModulesShowHiddenModulesAndAssignmentsForAuthoring() {
    UUID courseId = UUID.randomUUID();
    UUID teacherId = UUID.randomUUID();
    Course course = course(courseId);
    Module hiddenModule = module(UUID.randomUUID(), course, false);
    Assignment hiddenAssignment = assignment(UUID.randomUUID(), courseId, hiddenModule.getId(), "FILE_UPLOAD", false);

    when(moduleRepository.findByCourseIdOrderByPositionAsc(courseId)).thenReturn(List.of(hiddenModule));
    when(gradebookEntryRepository.findByCourseIdAndStudentId(courseId, teacherId)).thenReturn(List.of());
    when(accessService.canTeach(courseId, teacherId)).thenReturn(true);
    when(learningContentService.listModuleLearningItems(courseId, hiddenModule.getId(), teacherId)).thenReturn(List.of());
    when(assignmentRepository.findByModuleIdOrderByPositionAsc(hiddenModule.getId())).thenReturn(List.of(hiddenAssignment));
    when(assignmentMapper.toListItem(hiddenAssignment, null))
        .thenReturn(new AssignmentListItemDto(
            hiddenAssignment.getId(),
            hiddenModule.getId(),
            "Hidden",
            "file_submission",
            1,
            BigDecimal.TEN,
            null,
            "hidden",
            null));

    var response = courseService().modules(courseId, teacherId);

    assertThat(response.items()).hasSize(1);
    assertThat(response.items().getFirst().assignments()).extracting(AssignmentListItemDto::id)
        .containsExactly(hiddenAssignment.getId());
  }

  @Test
  void studentCannotAccessHiddenAssignmentById() {
    UUID assignmentId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "FILE_UPLOAD", false);

    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
    when(accessService.canTeach(courseId, studentId)).thenReturn(false);

    assertThatThrownBy(() -> assignmentService().getAssignment(assignmentId, studentId))
        .isInstanceOf(ApiException.class)
        .hasMessage("Assignment is not available");
  }

  @Test
  void studentCannotSubmitHiddenAssignment() {
    UUID assignmentId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "TEXT", false);

    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));

    assertThatThrownBy(() -> assignmentService().submit(
        assignmentId,
        studentId,
        "rte_submission",
        new SubmissionRequest("answer", null, null, null, null, null, null)))
        .isInstanceOf(ApiException.class)
        .hasMessage("Assignment is not available");
    verify(submissionRepository, never()).save(any());
  }

  @Test
  void assignmentTypeCannotChangeAfterCreation() {
    UUID assignmentId = UUID.randomUUID();
    UUID teacherId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "FILE_UPLOAD", true);

    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));

    AssignmentRequest request = new AssignmentRequest(
        "quiz",
        "Changed",
        "Desc",
        "Instructions",
        BigDecimal.TEN,
        1,
        null,
        true,
        null,
        null,
        null,
        null,
        null,
        null);

    assertThatThrownBy(() -> assignmentService().updateAssignment(assignmentId, teacherId, request))
        .isInstanceOf(ApiException.class)
        .hasMessage("Assignment type cannot be changed after creation");
  }

  @Test
  void studentGradebookDoesNotExposeDraftGrades() {
    UUID courseId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID assignmentId = UUID.randomUUID();
    Module module = module(UUID.randomUUID(), course(courseId), true);
    Assignment assignment = assignment(assignmentId, courseId, module.getId(), "SEMINAR", true);
    GradebookEntry draft = GradebookEntry.builder()
        .courseId(courseId)
        .studentId(studentId)
        .assignmentId(assignmentId)
        .maxScore(BigDecimal.TEN)
        .draftScore(new BigDecimal("9.00"))
        .status(GradeStatus.DRAFT)
        .build();

    when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(courseId)));
    when(assignmentRepository.findByCourseId(courseId)).thenReturn(List.of(assignment));
    when(gradebookEntryRepository.findByCourseIdAndStudentId(courseId, studentId)).thenReturn(List.of(draft));
    when(moduleRepository.findByCourseIdOrderByPositionAsc(courseId)).thenReturn(List.of(module));

    StudentGradebookDto gradebook = gradebookService().studentGradebook(courseId, studentId);

    StudentGradebookDto.AssignmentGradeDto grade = gradebook.modules().getFirst().assignments().getFirst();
    assertThat(grade.points()).isNull();
    assertThat(grade.status()).isEqualTo("not_published");
  }

  @Test
  void quizReviewIsBlockedWhenAttemptsCannotBeReviewed() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Quiz quiz = quiz(courseId, false, true, true, 10);
    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of("canReviewAttempts", false));
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now().minusMinutes(1), true);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));
    when(accessService.canTeach(courseId, studentId)).thenReturn(false);

    assertThatThrownBy(() -> quizAttemptService().review(attemptId, studentId))
        .isInstanceOf(ApiException.class)
        .hasMessage("Quiz attempt review is not available");
  }

  @Test
  void quizReviewHidesCorrectAnswerFlagAndScoreWhenSettingsDisallowThem() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Quiz quiz = quiz(courseId, false, true, false, 10);
    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of(
        "canReviewAttempts", true,
        "showCorrectAnswers", false,
        "showScoreAfterSubmit", false));
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now().minusMinutes(1), true);
    attempt.setAutoScore(BigDecimal.ZERO);
    attempt.setFinalScore(BigDecimal.ZERO);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));
    when(accessService.canTeach(courseId, studentId)).thenReturn(false);

    QuizAttemptReviewDto review = quizAttemptService().review(attemptId, studentId);

    assertThat(review.correctAnswersVisible()).isFalse();
    assertThat(review.autoScore()).isNull();
    assertThat(review.finalScore()).isNull();
  }

  @Test
  void quizSubmitRejectsExceededTimeLimit() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Quiz quiz = quiz(courseId, true, true, true, 1);
    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of());
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now().minusMinutes(5), false);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));

    assertThatThrownBy(() -> quizAttemptService().submit(
        attemptId,
        studentId,
        new QuizAttemptSubmitRequest(Map.of("q1", "a"))))
        .isInstanceOf(ApiException.class)
        .hasMessage("Quiz time limit has been exceeded");
  }

  @Test
  void activeAttemptReturnsSafeQuestionsWithoutCorrectAnswers() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    
    Quiz quiz = quiz(courseId, true, true, true, 10);
    QuestionBank question = question("MULTIPLE_CHOICE", Map.of("choice", "A"), BigDecimal.TEN);
    question.setExplanation("This is correct because...");
    QuizQuestion qq = quizQuestion(quiz, question, 1, null);
    quiz.setQuizQuestions(new java.util.HashSet<>(List.of(qq)));

    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of());
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now(), false);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));
    when(accessService.canTeach(courseId, studentId)).thenReturn(false);

    QuizAttemptActiveDto response = quizAttemptService().getActiveAttempt(attemptId, studentId);

    assertThat(response.id()).isEqualTo(attemptId);
    assertThat(response.questions()).hasSize(1);
    var qDto = response.questions().getFirst();
    assertThat(qDto.questionId()).isEqualTo(question.getId());
    assertThat(qDto.text()).isEqualTo(question.getStem());
    assertThat(qDto.options()).isEqualTo(question.getOptions());
  }

  @Test
  void quizSubmitRejectsUnknownQuestionIds() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    
    Quiz quiz = quiz(courseId, false, true, true, 10);
    QuestionBank question = question("MULTIPLE_CHOICE", Map.of("choice", "A"), BigDecimal.TEN);
    QuizQuestion qq = quizQuestion(quiz, question, 1, null);
    quiz.setQuizQuestions(new java.util.HashSet<>(List.of(qq)));

    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of());
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now().minusMinutes(1), false);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));

    QuizAttemptSubmitRequest badRequest = new QuizAttemptSubmitRequest(Map.of(
        UUID.randomUUID().toString(), "some answer"
    ));

    assertThatThrownBy(() -> quizAttemptService().submit(attemptId, studentId, badRequest))
        .isInstanceOf(ApiException.class)
        .hasMessage("Submitted question ID is not part of this quiz");
  }

  @Test
  void quizSubmitAutoScoresCorrectSingleChoiceAnswer() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Quiz quiz = quiz(courseId, false, true, true, 10);
    QuestionBank question = question("SINGLE_CHOICE", Map.of("answer", "A"), new BigDecimal("5.00"));
    quiz.getQuizQuestions().add(quizQuestion(quiz, question, 1, null));
    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of("showScoreAfterSubmit", true));
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now().minusMinutes(1), false);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));
    when(quizAttemptRepository.save(any(QuizAttempt.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());
    when(gradebookEntryRepository.findByAssignmentIdAndStudentId(assignment.getId(), studentId)).thenReturn(Optional.empty());
    when(gradebookEntryRepository.save(any(GradebookEntry.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());

    QuizAttemptReviewDto review = quizAttemptService().submit(
        attemptId,
        studentId,
        new QuizAttemptSubmitRequest(Map.of(question.getId().toString(), "a")));

    assertThat(review.autoScore()).isEqualByComparingTo("5.00");
    assertThat(review.finalScore()).isEqualByComparingTo("5.00");
  }

  @Test
  void quizSubmitScoresIncorrectAnswerAsZero() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Quiz quiz = quiz(courseId, false, true, true, 10);
    QuestionBank question = question("TRUE_FALSE", Map.of("answer", "true"), new BigDecimal("2.00"));
    quiz.getQuizQuestions().add(quizQuestion(quiz, question, 1, null));
    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of("showScoreAfterSubmit", true));
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now().minusMinutes(1), false);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));
    when(quizAttemptRepository.save(any(QuizAttempt.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());
    when(gradebookEntryRepository.findByAssignmentIdAndStudentId(assignment.getId(), studentId)).thenReturn(Optional.empty());
    when(gradebookEntryRepository.save(any(GradebookEntry.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());

    QuizAttemptReviewDto review = quizAttemptService().submit(
        attemptId,
        studentId,
        new QuizAttemptSubmitRequest(Map.of(question.getId().toString(), "false")));

    assertThat(review.autoScore()).isEqualByComparingTo("0.00");
    assertThat(review.finalScore()).isEqualByComparingTo("0.00");
  }

  @Test
  void quizSubmitAutoScoresMultipleChoiceSet() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Quiz quiz = quiz(courseId, false, true, true, 10);
    QuestionBank question = question("MULTIPLE_RESPONSE", Map.of("choices", List.of("A", "C")), new BigDecimal("4.00"));
    quiz.getQuizQuestions().add(quizQuestion(quiz, question, 1, null));
    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of("showScoreAfterSubmit", true));
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now().minusMinutes(1), false);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));
    when(quizAttemptRepository.save(any(QuizAttempt.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());
    when(gradebookEntryRepository.findByAssignmentIdAndStudentId(assignment.getId(), studentId)).thenReturn(Optional.empty());
    when(gradebookEntryRepository.save(any(GradebookEntry.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());

    QuizAttemptReviewDto review = quizAttemptService().submit(
        attemptId,
        studentId,
        new QuizAttemptSubmitRequest(Map.of(question.getId().toString(), List.of("c", "a"))));

    assertThat(review.autoScore()).isEqualByComparingTo("4.00");
  }

  @Test
  void quizSubmitDoesNotFakeManualQuestionScore() {
    UUID attemptId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Quiz quiz = quiz(courseId, false, true, true, 10);
    QuestionBank question = question("ESSAY", Map.of("answer", "ignored"), new BigDecimal("8.00"));
    quiz.getQuizQuestions().add(quizQuestion(quiz, question, 1, null));
    Assignment assignment = quizAssignment(UUID.randomUUID(), courseId, quiz.getId(), Map.of("showScoreAfterSubmit", true));
    QuizAttempt attempt = attempt(attemptId, quiz, studentId, LocalDateTime.now().minusMinutes(1), false);

    when(quizAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(assignmentRepository.findFirstByQuizId(quiz.getId())).thenReturn(Optional.of(assignment));
    when(quizAttemptRepository.save(any(QuizAttempt.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());
    when(gradebookEntryRepository.findByAssignmentIdAndStudentId(assignment.getId(), studentId)).thenReturn(Optional.empty());
    when(gradebookEntryRepository.save(any(GradebookEntry.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());

    QuizAttemptReviewDto review = quizAttemptService().submit(
        attemptId,
        studentId,
        new QuizAttemptSubmitRequest(Map.of(question.getId().toString(), "Long answer")));

    assertThat(review.autoScore()).isEqualByComparingTo("0.00");
    assertThat(review.finalScore()).isEqualByComparingTo("0.00");
  }

  @Test
  void studentCanEditOwnSubmissionWhenAllowedAndHistoryIsRecorded() {
    UUID submissionId = UUID.randomUUID();
    UUID assignmentId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "TEXT", true);
    assignment.setExternalToolConfig(Map.of("canonicalSettings", Map.of("allowEditAfterSubmit", true)));
    Submission submission = Submission.builder()
        .id(submissionId)
        .assignmentId(assignmentId)
        .userId(studentId)
        .status("SUBMITTED")
        .submittedAt(LocalDateTime.now().minusDays(1))
        .submissionVersion(1)
        .textAnswer("old")
        .build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
    when(submissionRepository.save(any(Submission.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());

    var result = assignmentService().editSubmission(
        submissionId,
        studentId,
        new SubmissionRequest("new answer", null, null, null, null, null, null));

    assertThat(result.version()).isEqualTo(2);
    assertThat(submission.getTextAnswer()).isEqualTo("new answer");
    verify(submissionVersionRepository).save(any(SubmissionVersion.class));
  }

  @Test
  void studentCannotEditSubmissionWhenDisabled() {
    UUID submissionId = UUID.randomUUID();
    UUID assignmentId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "TEXT", true);
    assignment.setExternalToolConfig(Map.of("canonicalSettings", Map.of("allowEditAfterSubmit", false)));
    Submission submission = Submission.builder()
        .id(submissionId)
        .assignmentId(assignmentId)
        .userId(studentId)
        .status("SUBMITTED")
        .submittedAt(LocalDateTime.now().minusDays(1))
        .submissionVersion(1)
        .build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));

    assertThatThrownBy(() -> assignmentService().editSubmission(
        submissionId,
        studentId,
        new SubmissionRequest("new answer", null, null, null, null, null, null)))
        .isInstanceOf(ApiException.class)
        .hasMessage("This assignment does not allow editing submissions");
  }

  @Test
  void studentCanWithdrawOwnSubmissionWhenAllowedAndHistoryIsRecorded() {
    UUID submissionId = UUID.randomUUID();
    UUID assignmentId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "TEXT", true);
    assignment.setExternalToolConfig(Map.of("canonicalSettings", Map.of("allowDeleteAfterSubmit", true)));
    Submission submission = Submission.builder()
        .id(submissionId)
        .assignmentId(assignmentId)
        .userId(studentId)
        .status("SUBMITTED")
        .submittedAt(LocalDateTime.now().minusDays(1))
        .submissionVersion(1)
        .textAnswer("answer")
        .build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
    when(submissionRepository.save(any(Submission.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());
    when(gradebookEntryRepository.findByAssignmentIdAndStudentId(assignmentId, studentId)).thenReturn(Optional.empty());
    when(gradebookEntryRepository.save(any(GradebookEntry.class))).thenAnswer(AdditionalAnswers.returnsFirstArg());

    assignmentService().withdrawSubmission(submissionId, studentId);

    assertThat(submission.getStatus()).isEqualTo("WITHDRAWN");
    assertThat(submission.getSubmittedAt()).isNull();
    assertThat(submission.getTextAnswer()).isNull();
    verify(submissionVersionRepository).save(any(SubmissionVersion.class));
  }

  @Test
  void anotherStudentCannotEditSubmission() {
    UUID submissionId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    UUID otherStudentId = UUID.randomUUID();
    Submission submission = Submission.builder()
        .id(submissionId)
        .assignmentId(UUID.randomUUID())
        .userId(ownerId)
        .status("SUBMITTED")
        .submissionVersion(1)
        .build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));

    assertThatThrownBy(() -> assignmentService().editSubmission(
        submissionId,
        otherStudentId,
        new SubmissionRequest("new answer", null, null, null, null, null, null)))
        .isInstanceOf(ApiException.class)
        .hasMessage("You cannot change another student's submission");
  }

  @Test
  void assignmentSettingsValidationRejectsInvalidFileSettings() {
    UUID assignmentId = UUID.randomUUID();
    UUID teacherId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "FILE_UPLOAD", true);
    AssignmentRequest request = new AssignmentRequest(
        "file_submission",
        "File",
        "",
        "",
        BigDecimal.TEN,
        1,
        null,
        true,
        new FileAssignmentSettingsDto(List.of(), 0, 10, true, false, true),
        null,
        null,
        null,
        null,
        null);

    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));

    assertThatThrownBy(() -> assignmentService().updateAssignment(assignmentId, teacherId, request))
        .isInstanceOf(ApiException.class)
        .hasMessage("maxFiles must be at least 1");
  }

  @Test
  void assignmentSettingsValidationRejectsInvalidQuizTimeLimit() {
    UUID assignmentId = UUID.randomUUID();
    UUID teacherId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "QUIZ", true);
    AssignmentRequest request = new AssignmentRequest(
        "quiz",
        "Quiz",
        "",
        "",
        BigDecimal.TEN,
        1,
        null,
        true,
        null,
        null,
        null,
        new QuizAssignmentSettingsDto(1, 0, true, false, true, false, "auto"),
        null,
        null);

    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));

    assertThatThrownBy(() -> assignmentService().updateAssignment(assignmentId, teacherId, request))
        .isInstanceOf(ApiException.class)
        .hasMessage("Quiz timeLimitMinutes must be at least 1 when set");
  }

  @Test
  void teacherGradebookUsesProfileDataWhenAvailableAndFallsBackToUserId() {
    UUID courseId = UUID.randomUUID();
    UUID teacherId = UUID.randomUUID();
    UUID profiledStudent = UUID.randomUUID();
    UUID fallbackStudent = UUID.randomUUID();
    Course course = course(courseId);
    CourseMember one = member(course, profiledStudent);
    CourseMember two = member(course, fallbackStudent);

    when(courseMemberRepository.findByCourseIdAndRoleInCourse(courseId, "STUDENT")).thenReturn(List.of(one, two));
    when(assignmentRepository.findByCourseId(courseId)).thenReturn(List.of());
    when(submissionRepository.findByAssignmentIdIn(List.of())).thenReturn(List.of());
    when(gradebookEntryRepository.findAllByCourseId(courseId)).thenReturn(List.of());
    when(userProfileClient.findProfile(profiledStudent)).thenReturn(Optional.of(
        new UserProfileClient.UserProfile(profiledStudent, "Ada Lovelace", "ada@example.test", "avatar.png", "USER")));
    when(userProfileClient.findProfile(fallbackStudent)).thenReturn(Optional.empty());

    TeacherGradebookDto dto = gradebookService().teacherGradebook(courseId, teacherId);

    assertThat(dto.students()).extracting(TeacherGradebookDto.StudentDto::displayName)
        .containsExactly("Ada Lovelace", fallbackStudent.toString());
    assertThat(dto.students().getFirst().email()).isEqualTo("ada@example.test");
    assertThat(dto.students().getFirst().avatarUrl()).isEqualTo("avatar.png");
  }

  private CanonicalCourseService courseService() {
    return new CanonicalCourseService(
        courseRepository,
        courseMemberRepository,
        moduleRepository,
        assignmentRepository,
        gradebookEntryRepository,
        learningContentService,
        assignmentMapper,
        accessService,
        legacyCourseService);
  }

  private CanonicalAssignmentService assignmentService() {
    return new CanonicalAssignmentService(
        assignmentRepository,
        moduleRepository,
        submissionRepository,
        submissionVersionRepository,
        quizRepository,
        quizAttemptRepository,
        gradebookEntryRepository,
        assignmentMapper,
        gradebookService(),
        accessService);
  }

  private CanonicalGradebookService gradebookService() {
    return new CanonicalGradebookService(
        courseRepository,
        courseMemberRepository,
        moduleRepository,
        assignmentRepository,
        gradebookEntryRepository,
        submissionRepository,
        accessService,
        userProfileClient);
  }

  private CanonicalQuizAttemptService quizAttemptService() {
    return new CanonicalQuizAttemptService(
        assignmentRepository,
        quizRepository,
        quizAttemptRepository,
        gradebookService(),
        accessService);
  }

  private Course course(UUID courseId) {
    return Course.builder()
        .id(courseId)
        .code("C-" + courseId.toString().substring(0, 8))
        .titleUk("Course")
        .ownerId(UUID.randomUUID())
        .build();
  }

  private Module module(UUID moduleId, Course course, boolean published) {
    return Module.builder()
        .id(moduleId)
        .course(course)
        .title("Module")
        .position(1)
        .isPublished(published)
        .build();
  }

  private Assignment assignment(UUID assignmentId, UUID courseId, UUID moduleId, String type, boolean published) {
    return Assignment.builder()
        .id(assignmentId)
        .courseId(courseId)
        .moduleId(moduleId)
        .assignmentType(type)
        .title(published ? "Visible" : "Hidden")
        .description("")
        .maxPoints(BigDecimal.TEN)
        .position(1)
        .isPublished(published)
        .isArchived(false)
        .createdBy(UUID.randomUUID())
        .build();
  }

  private Assignment quizAssignment(UUID assignmentId, UUID courseId, UUID quizId, Map<String, Object> settings) {
    Assignment assignment = assignment(assignmentId, courseId, UUID.randomUUID(), "QUIZ", true);
    assignment.setQuizId(quizId);
    assignment.setExternalToolConfig(Map.of("canonicalSettings", settings));
    return assignment;
  }

  private CourseMember member(Course course, UUID studentId) {
    return CourseMember.builder()
        .id(UUID.randomUUID())
        .course(course)
        .userId(studentId)
        .roleInCourse("STUDENT")
        .enrollmentStatus("active")
        .build();
  }

  private QuestionBank question(String type, Map<String, Object> correctAnswer, BigDecimal points) {
    return QuestionBank.builder()
        .id(UUID.randomUUID())
        .questionType(type)
        .stem("Question")
        .correctAnswer(correctAnswer)
        .points(points)
        .createdBy(UUID.randomUUID())
        .build();
  }

  private QuizQuestion quizQuestion(Quiz quiz, QuestionBank question, int position, BigDecimal pointsOverride) {
    return QuizQuestion.builder()
        .id(UUID.randomUUID())
        .quiz(quiz)
        .question(question)
        .position(position)
        .pointsOverride(pointsOverride)
        .build();
  }

  private Quiz quiz(
      UUID courseId,
      boolean timerEnabled,
      boolean showCorrectAnswers,
      boolean showScoreAfterSubmit,
      int timeLimit) {
    return Quiz.builder()
        .id(UUID.randomUUID())
        .courseId(courseId)
        .title("Quiz")
        .timerEnabled(timerEnabled)
        .timeLimit(timeLimit)
        .attemptsAllowed(1)
        .showCorrectAnswers(showCorrectAnswers)
        .createdBy(UUID.randomUUID())
        .build();
  }

  private QuizAttempt attempt(
      UUID attemptId,
      Quiz quiz,
      UUID studentId,
      LocalDateTime startedAt,
      boolean submitted) {
    QuizAttempt attempt = QuizAttempt.builder()
        .id(attemptId)
        .quiz(quiz)
        .userId(studentId)
        .attemptNumber(1)
        .startedAt(startedAt)
        .answers(Map.of("q1", "a"))
        .autoScore(BigDecimal.ZERO)
        .finalScore(BigDecimal.ZERO)
        .build();
    if (submitted) {
      attempt.setSubmittedAt(startedAt.plusMinutes(1));
    }
    return attempt;
  }
}
