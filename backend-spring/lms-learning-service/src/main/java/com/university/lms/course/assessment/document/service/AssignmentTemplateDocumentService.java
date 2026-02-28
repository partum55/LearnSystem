package com.university.lms.course.assessment.document.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.document.domain.AssignmentTemplateDocument;
import com.university.lms.course.assessment.document.dto.CloneTemplateResponse;
import com.university.lms.course.assessment.document.repository.AssignmentTemplateDocumentRepository;
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
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for assignment starter-template documents and student clone flow. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssignmentTemplateDocumentService {

  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

  private final AssignmentRepository assignmentRepository;
  private final AssignmentTemplateDocumentRepository templateRepository;
  private final SubmissionRepository submissionRepository;
  private final SubmissionDocumentRepository submissionDocumentRepository;
  private final CourseMemberRepository courseMemberRepository;
  private final DocumentValidationService documentValidationService;
  private final DocumentNormalizationService documentNormalizationService;
  private final ObjectMapper objectMapper;

  public CanonicalDocumentDto getTemplateDocument(UUID assignmentId, UUID userId, String userRole) {
    Assignment assignment = findAssignment(assignmentId);
    ensureManageAccess(assignment, userId, userRole);

    return templateRepository
        .findById(assignmentId)
        .map(
            template ->
                CanonicalDocumentDto.builder()
                    .ownerId(assignmentId)
                    .schemaVersion(template.getSchemaVersion())
                    .document(objectMapper.valueToTree(template.getDocJson()))
                    .updatedAt(template.getUpdatedAt())
                    .publishedSnapshot(false)
                    .build())
        .orElseGet(() -> CanonicalDocumentDto.empty(assignmentId, assignment.getTitle()));
  }

  @Transactional
  public CanonicalDocumentDto upsertTemplateDocument(
      UUID assignmentId,
      UpsertCanonicalDocumentRequest request,
      UUID userId,
      String userRole) {
    Assignment assignment = findAssignment(assignmentId);
    ensureManageAccess(assignment, userId, userRole);

    JsonNode document = documentNormalizationService.normalize(request.getDocument());
    documentValidationService.validate(document, EditorMode.LITE);

    AssignmentTemplateDocument template =
        templateRepository
            .findById(assignmentId)
            .orElseGet(() -> AssignmentTemplateDocument.builder().assignmentId(assignmentId).build());

    template.setDocJson(objectMapper.convertValue(document, MAP_TYPE));
    template.setSchemaVersion(request.getSchemaVersion() == null ? 1 : request.getSchemaVersion());
    template.setUpdatedBy(userId);

    AssignmentTemplateDocument saved = templateRepository.save(template);

    return CanonicalDocumentDto.builder()
        .ownerId(assignmentId)
        .schemaVersion(saved.getSchemaVersion())
        .document(objectMapper.valueToTree(saved.getDocJson()))
        .updatedAt(saved.getUpdatedAt())
        .publishedSnapshot(false)
        .build();
  }

  @Transactional
  public CloneTemplateResponse cloneTemplateToSubmission(UUID assignmentId, UUID userId, String userRole) {
    Assignment assignment = findAssignment(assignmentId);
    ensureEnrollmentOrManageAccess(assignment, userId, userRole);

    Submission submission =
        submissionRepository
            .findByAssignmentIdAndUserId(assignmentId, userId)
            .orElseGet(
                () ->
                    submissionRepository.save(
                        Submission.builder().assignmentId(assignmentId).userId(userId).status("DRAFT").build()));

    AssignmentTemplateDocument template = templateRepository.findById(assignmentId).orElse(null);
    Map<String, Object> templateJson =
        template != null
            ? new HashMap<>(template.getDocJson())
            : new HashMap<>(toMap(CanonicalDocumentDto.empty(assignmentId, assignment.getTitle()).getDocument()));

    SubmissionDocument submissionDocument =
        submissionDocumentRepository
            .findById(submission.getId())
            .orElseGet(() -> SubmissionDocument.builder().submissionId(submission.getId()).build());

    submissionDocument.setDocJson(templateJson);
    submissionDocument.setSchemaVersion(template != null ? template.getSchemaVersion() : 1);
    submissionDocumentRepository.save(submissionDocument);

    log.info(
        "Cloned assignment template {} into submission {} for user {}",
        assignmentId,
        submission.getId(),
        userId);

    return CloneTemplateResponse.builder()
        .assignmentId(assignmentId)
        .submissionId(submission.getId())
        .build();
  }

  private Assignment findAssignment(UUID assignmentId) {
    return assignmentRepository
        .findById(assignmentId)
        .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", assignmentId));
  }

  private void ensureManageAccess(Assignment assignment, UUID userId, String userRole) {
    if (isSuperAdmin(userRole)
        || assignment.getCreatedBy().equals(userId)
        || courseMemberRepository.canUserManageCourse(assignment.getCourseId(), userId)) {
      return;
    }

    throw new ValidationException("You don't have permission to edit assignment templates");
  }

  private void ensureEnrollmentOrManageAccess(Assignment assignment, UUID userId, String userRole) {
    if (isSuperAdmin(userRole)
        || assignment.getCreatedBy().equals(userId)
        || courseMemberRepository.canUserManageCourse(assignment.getCourseId(), userId)
        || courseMemberRepository.existsByCourseIdAndUserId(assignment.getCourseId(), userId)) {
      return;
    }

    throw new ValidationException("You don't have access to this assignment");
  }

  private boolean isSuperAdmin(String userRole) {
    return "SUPERADMIN".equalsIgnoreCase(userRole);
  }

  private Map<String, Object> toMap(JsonNode node) {
    return objectMapper.convertValue(node, MAP_TYPE);
  }
}
