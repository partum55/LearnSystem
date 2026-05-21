package com.university.lms.course.assignments.controller;

import com.university.lms.course.assignments.dto.AssignmentDetailDto;
import com.university.lms.course.assignments.dto.AssignmentRequest;
import com.university.lms.course.assignments.service.CanonicalAssignmentService;
import com.university.lms.course.common.api.ListResponse;
import com.university.lms.course.submissions.dto.GradeDraftRequest;
import com.university.lms.course.submissions.dto.SubmissionDto;
import com.university.lms.course.submissions.dto.SubmissionRequest;
import com.university.lms.course.submissions.dto.SubmissionReviewDto;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class CanonicalAssignmentController {
  private final CanonicalAssignmentService assignmentService;
  private final RequestUserContext userContext;

  @GetMapping("/assignments/{assignmentId}")
  public AssignmentDetailDto get(@PathVariable UUID assignmentId) {
    return assignmentService.getAssignment(assignmentId, userContext.requireUserId());
  }

  @PostMapping("/courses/{courseId}/modules/{moduleId}/assignments")
  @ResponseStatus(HttpStatus.CREATED)
  public AssignmentDetailDto create(
      @PathVariable UUID courseId,
      @PathVariable UUID moduleId,
      @Valid @RequestBody AssignmentRequest request) {
    return assignmentService.createAssignment(courseId, moduleId, userContext.requireUserId(), request);
  }

  @PatchMapping("/assignments/{assignmentId}")
  public AssignmentDetailDto update(
      @PathVariable UUID assignmentId,
      @Valid @RequestBody AssignmentRequest request) {
    return assignmentService.updateAssignment(assignmentId, userContext.requireUserId(), request);
  }

  @DeleteMapping("/assignments/{assignmentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID assignmentId) {
    assignmentService.deleteAssignment(assignmentId, userContext.requireUserId());
  }

  @PostMapping("/assignments/{assignmentId}/submissions/file")
  @ResponseStatus(HttpStatus.CREATED)
  public SubmissionDto submitFile(
      @PathVariable UUID assignmentId,
      @Valid @RequestBody SubmissionRequest request) {
    return assignmentService.submit(assignmentId, userContext.requireUserId(), "file_submission", request);
  }

  @PostMapping("/assignments/{assignmentId}/submissions/rte")
  @ResponseStatus(HttpStatus.CREATED)
  public SubmissionDto submitRte(
      @PathVariable UUID assignmentId,
      @Valid @RequestBody SubmissionRequest request) {
    return assignmentService.submit(assignmentId, userContext.requireUserId(), "rte_submission", request);
  }

  @PostMapping("/assignments/{assignmentId}/submissions/form")
  @ResponseStatus(HttpStatus.CREATED)
  public SubmissionDto submitForm(
      @PathVariable UUID assignmentId,
      @Valid @RequestBody SubmissionRequest request) {
    return assignmentService.submit(assignmentId, userContext.requireUserId(), "form", request);
  }

  @PostMapping("/assignments/{assignmentId}/submissions/vpl")
  @ResponseStatus(HttpStatus.CREATED)
  public SubmissionDto submitVpl(
      @PathVariable UUID assignmentId,
      @Valid @RequestBody SubmissionRequest request) {
    return assignmentService.submit(assignmentId, userContext.requireUserId(), "vpl", request);
  }

  @GetMapping("/assignments/{assignmentId}/submissions")
  public ListResponse<SubmissionDto> submissions(
      @PathVariable UUID assignmentId,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize) {
    return ListResponse.of(assignmentService.listSubmissions(
        assignmentId,
        userContext.requireUserId(),
        PageRequest.of(Math.max(page - 1, 0), pageSize)));
  }

  @GetMapping("/submissions/{submissionId}/review")
  public SubmissionReviewDto review(@PathVariable UUID submissionId) {
    return assignmentService.reviewSubmission(submissionId, userContext.requireUserId());
  }

  @PatchMapping("/submissions/{submissionId}")
  public SubmissionDto editSubmission(
      @PathVariable UUID submissionId,
      @Valid @RequestBody SubmissionRequest request) {
    return assignmentService.editSubmission(submissionId, userContext.requireUserId(), request);
  }

  @DeleteMapping("/submissions/{submissionId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void withdrawSubmission(@PathVariable UUID submissionId) {
    assignmentService.withdrawSubmission(submissionId, userContext.requireUserId());
  }

  @PatchMapping("/submissions/{submissionId}/grade-draft")
  public SubmissionReviewDto saveDraft(
      @PathVariable UUID submissionId,
      @Valid @RequestBody GradeDraftRequest request) {
    return assignmentService.saveDraftGrade(submissionId, userContext.requireUserId(), request);
  }

  @PostMapping("/submissions/{submissionId}/publish-grade")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void publish(@PathVariable UUID submissionId) {
    assignmentService.publishGrade(submissionId, userContext.requireUserId());
  }
}
