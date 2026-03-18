package com.university.lms.submission.web;

import com.university.lms.submission.dto.*;
import com.university.lms.submission.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for submissions.
 */
@RestController
@RequestMapping("/submissions")
@RequiredArgsConstructor
@Slf4j
public class SubmissionController {

    private final SubmissionService submissionService;

    @GetMapping
    public ResponseEntity<List<SubmissionResponse>> getForAssignment(
            @RequestParam UUID assignmentId,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        List<SubmissionResponse> submissions = submissionService.getSubmissionsForAssignment(assignmentId, userId, userRole);
        return ResponseEntity.ok(submissions);
    }

    @GetMapping("/my")
    public ResponseEntity<SubmissionResponse> getMySubmission(
            @RequestParam UUID assignmentId,
            @RequestAttribute("userId") UUID userId) {

        SubmissionResponse submission = submissionService.getMySubmission(assignmentId, userId);
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/{submissionId}")
    public ResponseEntity<SubmissionResponse> getById(
            @PathVariable UUID submissionId,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        SubmissionResponse submission = submissionService.getSubmission(submissionId, userId, userRole);
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/internal/{submissionId}")
    public ResponseEntity<SubmissionResponse> getByIdInternal(@PathVariable UUID submissionId) {
        SubmissionResponse submission = submissionService.getSubmission(submissionId, null, null);
        return ResponseEntity.ok(submission);
    }

    @PostMapping(consumes = "application/json")
    public ResponseEntity<SubmissionResponse> createDraft(
            @Valid @RequestBody CreateSubmissionRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userEmail") String userEmail) {

        SubmissionResponse submission = submissionService.createOrGetDraft(request, userId, userEmail);
        return ResponseEntity.status(201).body(submission);
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<SubmissionResponse> createMultipart(
            @RequestParam UUID assignmentId,
            @RequestParam(required = false) String content,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userEmail") String userEmail) {

        List<MultipartFile> safeFiles = files == null ? Collections.emptyList() : files;
        SubmissionResponse submission = submissionService.createAndSubmit(assignmentId, content, safeFiles, userId, userEmail);
        return ResponseEntity.status(201).body(submission);
    }

    @PostMapping(path = "/{submissionId}/files", consumes = "multipart/form-data")
    public ResponseEntity<SubmissionResponse> uploadFile(
            @PathVariable UUID submissionId,
            @RequestPart("file") MultipartFile file,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        SubmissionResponse submission = submissionService.uploadFiles(submissionId, List.of(file), userId, userRole);
        return ResponseEntity.ok(submission);
    }

    @PutMapping(path = "/{submissionId}/draft", consumes = "application/json")
    public ResponseEntity<SubmissionResponse> updateDraft(
            @PathVariable UUID submissionId,
            @RequestBody UpdateSubmissionDraftRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        UpdateSubmissionDraftRequest safeRequest =
                request == null ? new UpdateSubmissionDraftRequest() : request;
        SubmissionResponse submission =
                submissionService.updateDraft(submissionId, safeRequest, userId, userRole);
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/{submissionId}/files/{fileId}")
    public ResponseEntity<?> downloadFile(
            @PathVariable UUID submissionId,
            @PathVariable UUID fileId,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        SubmissionService.DownloadedFile downloadedFile = submissionService.loadFile(submissionId, fileId, userId, userRole);

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(downloadedFile.fileName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(downloadedFile.mediaType())
                .body(downloadedFile.resource());
    }

    @PostMapping("/{submissionId}/submit")
    public ResponseEntity<SubmissionResponse> submit(
            @PathVariable UUID submissionId,
            @RequestBody(required = false) SubmitSubmissionRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        SubmitSubmissionRequest safeRequest = request == null ? new SubmitSubmissionRequest() : request;
        SubmissionResponse submission = submissionService.submit(submissionId, safeRequest, userId, userRole);
        return ResponseEntity.ok(submission);
    }

    @PostMapping("/{submissionId}/grade")
    public ResponseEntity<Map<String, Object>> grade(
            @PathVariable UUID submissionId,
            @Valid @RequestBody GradeSubmissionRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        log.warn(
                "Deprecated /grade endpoint called for submission {} by user {} role {} (score={})",
                submissionId,
                userId,
                userRole,
                request == null ? null : request.resolvedGrade());
        Map<String, Object> body = Map.of(
                "code", "DEPRECATED_ENDPOINT",
                "message", "POST /submissions/{id}/grade is deprecated. Use /grade-draft and /publish-grade endpoints.");
        return ResponseEntity.status(HttpStatus.GONE).body(body);
    }

    @PostMapping("/{submissionId}/grade-draft")
    public ResponseEntity<SubmissionResponse> saveGradeDraft(
            @PathVariable UUID submissionId,
            @Valid @RequestBody GradeDraftRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        SubmissionResponse submission = submissionService.saveGradeDraft(submissionId, request, userId, userRole);
        return ResponseEntity.ok(submission);
    }

    @PostMapping("/{submissionId}/publish-grade")
    public ResponseEntity<SubmissionResponse> publishGrade(
            @PathVariable UUID submissionId,
            @RequestBody(required = false) PublishGradeRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        PublishGradeRequest safeRequest = request == null ? new PublishGradeRequest() : request;
        SubmissionResponse submission = submissionService.publishGrade(submissionId, safeRequest, userId, userRole);
        return ResponseEntity.ok(submission);
    }

    @PostMapping("/grades/publish-bulk")
    public ResponseEntity<BulkPublishGradesResponse> publishBulk(
            @Valid @RequestBody BulkPublishGradesRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        BulkPublishGradesResponse response = submissionService.publishBulk(request, userId, userRole);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{submissionId}/comments")
    public ResponseEntity<SubmissionResponse> addComment(
            @PathVariable UUID submissionId,
            @Valid @RequestBody AddCommentRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userEmail") String userEmail,
            @RequestAttribute("userRole") String userRole) {

        SubmissionResponse submission = submissionService.addComment(submissionId, request, userId, userEmail, userRole);
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/speedgrader")
    public ResponseEntity<SpeedGraderResponse> getSpeedgraderQueue(
            @RequestParam UUID assignmentId,
            @RequestAttribute("userRole") String userRole) {

        SpeedGraderResponse response = submissionService.getSpeedGraderQueue(assignmentId, userRole);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/review-queue")
    public ResponseEntity<ReviewQueueResponse> getReviewQueue(
            @RequestParam UUID assignmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "needs_review") String sort,
            @RequestAttribute("userRole") String userRole) {

        ReviewQueueResponse response = submissionService.getReviewQueue(assignmentId, status, search, page, size, sort, userRole);
        return ResponseEntity.ok(response);
    }
}
