package com.university.lms.submission.web;

import com.university.lms.submission.dto.*;
import com.university.lms.submission.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
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
    public ResponseEntity<SubmissionResponse> grade(
            @PathVariable UUID submissionId,
            @Valid @RequestBody GradeSubmissionRequest request,
            @RequestAttribute("userId") UUID userId,
            @RequestAttribute("userRole") String userRole) {

        SubmissionResponse submission = submissionService.grade(submissionId, request, userId, userRole);
        return ResponseEntity.ok(submission);
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
}
