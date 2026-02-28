package com.university.lms.submission.document.web;

import com.university.lms.course.content.dto.CanonicalDocumentDto;
import com.university.lms.course.content.dto.UpsertCanonicalDocumentRequest;
import com.university.lms.course.web.RequestUserContext;
import com.university.lms.submission.document.service.SubmissionDocumentService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Endpoints for submission canonical document editing and retrieval. */
@RestController
@RequestMapping("/submissions")
@RequiredArgsConstructor
public class SubmissionDocumentController {

  private final SubmissionDocumentService submissionDocumentService;
  private final RequestUserContext requestUserContext;

  @GetMapping("/{submissionId}/document")
  public ResponseEntity<CanonicalDocumentDto> getDocument(@PathVariable UUID submissionId) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(
        submissionDocumentService.getSubmissionDocument(submissionId, userId, userRole));
  }

  @PutMapping("/{submissionId}/document")
  public ResponseEntity<CanonicalDocumentDto> upsertDocument(
      @PathVariable UUID submissionId,
      @Valid @RequestBody UpsertCanonicalDocumentRequest request) {
    UUID userId = requestUserContext.requireUserId();
    String userRole = requestUserContext.requireUserRole();

    return ResponseEntity.ok(
        submissionDocumentService.upsertSubmissionDocument(
            submissionId, request, userId, userRole));
  }
}
