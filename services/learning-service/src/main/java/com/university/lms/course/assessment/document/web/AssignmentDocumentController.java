package com.university.lms.course.assessment.document.web;

import com.university.lms.course.assessment.document.dto.CloneTemplateResponse;
import com.university.lms.course.assessment.document.service.AssignmentTemplateDocumentService;
import com.university.lms.course.content.dto.CanonicalDocumentDto;
import com.university.lms.course.content.dto.UpsertCanonicalDocumentRequest;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Endpoints for assignment template documents and clone workflow. */
@RestController
@RequestMapping("/assignments")
@RequiredArgsConstructor
public class AssignmentDocumentController {

  private final AssignmentTemplateDocumentService assignmentTemplateDocumentService;
  private final RequestUserContext requestUserContext;

  @GetMapping("/{assignmentId}/template-document")
  public ResponseEntity<CanonicalDocumentDto> getTemplateDocument(@PathVariable UUID assignmentId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(
        assignmentTemplateDocumentService.getTemplateDocument(assignmentId, userId, userRole));
  }

  @PutMapping("/{assignmentId}/template-document")
  public ResponseEntity<CanonicalDocumentDto> upsertTemplateDocument(
      @PathVariable UUID assignmentId,
      @Valid @RequestBody UpsertCanonicalDocumentRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(
        assignmentTemplateDocumentService.upsertTemplateDocument(
            assignmentId, request, userId, userRole));
  }

  @PostMapping("/{assignmentId}/submissions/clone-template")
  public ResponseEntity<CloneTemplateResponse> cloneTemplate(@PathVariable UUID assignmentId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(
        assignmentTemplateDocumentService.cloneTemplateToSubmission(assignmentId, userId, userRole));
  }
}
