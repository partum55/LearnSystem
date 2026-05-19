package com.university.lms.submission.document.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.content.dto.CanonicalDocumentDto;
import com.university.lms.course.content.dto.UpsertCanonicalDocumentRequest;
import com.university.lms.course.content.service.DocumentValidationService;
import com.university.lms.course.content.service.EditorMode;
import com.university.lms.course.content.service.DocumentNormalizationService;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.submission.document.domain.SubmissionDocument;
import com.university.lms.submission.document.repository.SubmissionDocumentRepository;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.repository.SubmissionRepository;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for canonical submission documents used by the student lite editor. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubmissionDocumentService {

  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

  private final SubmissionRepository submissionRepository;
  private final SubmissionDocumentRepository submissionDocumentRepository;
  private final AssignmentRepository assignmentRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final DocumentValidationService documentValidationService;
  private final DocumentNormalizationService documentNormalizationService;
  private final ObjectMapper objectMapper;

  public CanonicalDocumentDto getSubmissionDocument(UUID submissionId, UUID userId, String userRole) {
    Submission submission = findSubmission(submissionId);
    Assignment assignment = findAssignment(submission.getAssignmentId());

    ensureCanAccessSubmission(submission, assignment, userId, userRole);

    return submissionDocumentRepository
        .findById(submissionId)
        .map(
            document ->
                CanonicalDocumentDto.builder()
                    .ownerId(submissionId)
                    .schemaVersion(document.getSchemaVersion())
                    .document(objectMapper.valueToTree(document.getDocJson()))
                    .updatedAt(document.getUpdatedAt())
                    .publishedSnapshot(false)
                    .build())
        .orElseGet(() -> CanonicalDocumentDto.empty(submissionId, assignment.getTitle()));
  }

  @Transactional
  public CanonicalDocumentDto upsertSubmissionDocument(
      UUID submissionId,
      UpsertCanonicalDocumentRequest request,
      UUID userId,
      String userRole) {
    Submission submission = findSubmission(submissionId);
    Assignment assignment = findAssignment(submission.getAssignmentId());

    ensureCanEditSubmission(submission, assignment, userId, userRole);

    JsonNode document = documentNormalizationService.normalize(request.getDocument());
    documentValidationService.validate(document, EditorMode.LITE);

    SubmissionDocument submissionDocument =
        submissionDocumentRepository
            .findById(submissionId)
            .orElseGet(() -> SubmissionDocument.builder().submissionId(submissionId).build());

    submissionDocument.setDocJson(objectMapper.convertValue(document, MAP_TYPE));
    submissionDocument.setSchemaVersion(request.getSchemaVersion() == null ? 1 : request.getSchemaVersion());

    SubmissionDocument saved = submissionDocumentRepository.save(submissionDocument);

    return CanonicalDocumentDto.builder()
        .ownerId(submissionId)
        .schemaVersion(saved.getSchemaVersion())
        .document(objectMapper.valueToTree(saved.getDocJson()))
        .updatedAt(saved.getUpdatedAt())
        .publishedSnapshot(false)
        .build();
  }

  private Submission findSubmission(UUID submissionId) {
    return submissionRepository
        .findById(submissionId)
        .orElseThrow(() -> new ResourceNotFoundException("Submission", "id", submissionId));
  }

  private Assignment findAssignment(UUID assignmentId) {
    return assignmentRepository
        .findById(assignmentId)
        .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", assignmentId));
  }

  private void ensureCanAccessSubmission(
      Submission submission, Assignment assignment, UUID userId, String userRole) {
    if (submission.getUserId().equals(userId)) {
      return;
    }

    if (isSuperAdmin(userRole)
        || assignment.getCreatedBy().equals(userId)
        || courseMemberRepository.canUserManageCourse(assignment.getCourseId(), userId)) {
      return;
    }

    throw new ValidationException("You don't have permission to view this submission document");
  }

  private void ensureCanEditSubmission(
      Submission submission, Assignment assignment, UUID userId, String userRole) {
    if (submission.getUserId().equals(userId)) {
      return;
    }

    if (isSuperAdmin(userRole)
        || assignment.getCreatedBy().equals(userId)
        || courseMemberRepository.canUserManageCourse(assignment.getCourseId(), userId)) {
      return;
    }

    throw new ValidationException("You don't have permission to edit this submission document");
  }

  private boolean isSuperAdmin(String userRole) {
    return "SUPERADMIN".equalsIgnoreCase(userRole);
  }
}
