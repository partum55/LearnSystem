package com.university.lms.submission.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.dto.GradeDraftRequest;
import com.university.lms.submission.dto.PublishGradeRequest;
import com.university.lms.submission.dto.SubmissionResponse;
import com.university.lms.submission.dto.UpdateSubmissionDraftRequest;
import com.university.lms.submission.repository.SubmissionCommentRepository;
import com.university.lms.submission.repository.SubmissionFileRepository;
import com.university.lms.submission.repository.SubmissionGradeAuditRepository;
import com.university.lms.submission.repository.SubmissionRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class SubmissionServiceTest {

  @Mock private SubmissionRepository submissionRepository;
  @Mock private SubmissionFileRepository submissionFileRepository;
  @Mock private SubmissionCommentRepository submissionCommentRepository;
  @Mock private SubmissionGradeAuditRepository submissionGradeAuditRepository;
  @Mock private SubmissionFileStorageService fileStorageService;
  @Mock private SubmissionAccessService submissionAccessService;
  @Mock private SubmissionLateStatusService submissionLateStatusService;
  @Spy private SubmissionMapper submissionMapper = new SubmissionMapper();
  @Mock private ApplicationEventPublisher eventPublisher;
  @Mock private AssignmentRepository assignmentRepository;

  @InjectMocks private SubmissionService submissionService;

  @Test
  void updateDraftShouldApplyContentFieldsForDraftSubmission() {
    UUID submissionId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    Submission submission =
        Submission.builder()
            .id(submissionId)
            .assignmentId(UUID.randomUUID())
            .userId(ownerId)
            .status("DRAFT")
            .build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    when(submissionRepository.save(any(Submission.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, Submission.class));

    UpdateSubmissionDraftRequest request =
        UpdateSubmissionDraftRequest.builder()
            .content("print('Hello')")
            .submissionUrl("https://example.com/submission")
            .programmingLanguage("python")
            .build();

    SubmissionResponse response =
        submissionService.updateDraft(submissionId, request, ownerId, "STUDENT");

    verify(submissionAccessService).assertOwnerOrStaff(submission, ownerId, "STUDENT");
    verify(submissionRepository).save(submission);

    assertThat(submission.getTextAnswer()).isEqualTo("print('Hello')");
    assertThat(submission.getSubmissionUrl()).isEqualTo("https://example.com/submission");
    assertThat(submission.getProgrammingLanguage()).isEqualTo("python");
    assertThat(response.getTextAnswer()).isEqualTo("print('Hello')");
    assertThat(response.getSubmissionUrl()).isEqualTo("https://example.com/submission");
    assertThat(response.getProgrammingLanguage()).isEqualTo("python");
  }

  @Test
  void updateDraftShouldPreferContentOverTextAnswerWhenBothProvided() {
    UUID submissionId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    Submission submission =
        Submission.builder()
            .id(submissionId)
            .assignmentId(UUID.randomUUID())
            .userId(ownerId)
            .status("DRAFT")
            .build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    when(submissionRepository.save(any(Submission.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, Submission.class));

    UpdateSubmissionDraftRequest request =
        UpdateSubmissionDraftRequest.builder().content("content-value").textAnswer("text-answer").build();

    SubmissionResponse response =
        submissionService.updateDraft(submissionId, request, ownerId, "STUDENT");

    assertThat(submission.getTextAnswer()).isEqualTo("content-value");
    assertThat(response.getTextAnswer()).isEqualTo("content-value");
  }

  @Test
  void updateDraftShouldRejectNonDraftSubmission() {
    UUID submissionId = UUID.randomUUID();
    UUID ownerId = UUID.randomUUID();
    Submission submitted =
        Submission.builder()
            .id(submissionId)
            .assignmentId(UUID.randomUUID())
            .userId(ownerId)
            .status("SUBMITTED")
            .build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submitted));

    assertThatThrownBy(
            () ->
                submissionService.updateDraft(
                    submissionId,
                    UpdateSubmissionDraftRequest.builder().content("new-content").build(),
                    ownerId,
                    "STUDENT"))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("Only draft submissions can be updated");

    verify(submissionRepository, never()).save(any(Submission.class));
  }

  @Test
  void saveGradeDraftShouldPersistDraftWithoutPublishingEvent() {
    UUID submissionId = UUID.randomUUID();
    UUID assignmentId = UUID.randomUUID();
    UUID graderId = UUID.randomUUID();

    Submission submission =
        Submission.builder()
            .id(submissionId)
            .assignmentId(assignmentId)
            .userId(UUID.randomUUID())
            .status("IN_REVIEW")
            .build();

    Assignment assignment = Assignment.builder().id(assignmentId).courseId(UUID.randomUUID()).build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
    when(submissionAccessService.isStaff("TEACHER")).thenReturn(true);
    when(submissionRepository.save(any(Submission.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, Submission.class));

    SubmissionResponse response =
        submissionService.saveGradeDraft(
            submissionId,
            GradeDraftRequest.builder()
                .rawScore(new java.math.BigDecimal("90"))
                .finalScore(new java.math.BigDecimal("88"))
                .feedback("Draft feedback")
                .build(),
            graderId,
            "TEACHER");

    assertThat(submission.getStatus()).isEqualTo("GRADED_DRAFT");
    assertThat(response.getDraftGrade()).isEqualTo(new java.math.BigDecimal("88.00"));
    verify(eventPublisher, never()).publishEvent(any());
  }

  @Test
  void publishGradeShouldPublishEventAndClearDraftFields() {
    UUID submissionId = UUID.randomUUID();
    UUID assignmentId = UUID.randomUUID();
    UUID graderId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();

    Submission submission =
        Submission.builder()
            .id(submissionId)
            .assignmentId(assignmentId)
            .userId(studentId)
            .status("GRADED_DRAFT")
            .draftGrade(new java.math.BigDecimal("75"))
            .draftFeedback("Needs more detail")
            .isLate(true)
            .build();

    Assignment assignment = Assignment.builder().id(assignmentId).courseId(courseId).build();

    when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
    when(submissionAccessService.isStaff("TEACHER")).thenReturn(true);
    when(submissionRepository.save(any(Submission.class)))
        .thenAnswer(invocation -> invocation.getArgument(0, Submission.class));

    SubmissionResponse response =
        submissionService.publishGrade(
            submissionId,
            PublishGradeRequest.builder().build(),
            graderId,
            "TEACHER");

    assertThat(submission.getStatus()).isEqualTo("GRADED_PUBLISHED");
    assertThat(submission.getDraftGrade()).isNull();
    assertThat(submission.getPublishedGrade()).isEqualTo(new java.math.BigDecimal("75.00"));
    assertThat(response.getGrade()).isEqualTo(new java.math.BigDecimal("75.00"));
    verify(eventPublisher, times(1)).publishEvent(any());
  }
}
