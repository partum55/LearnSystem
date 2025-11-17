package com.university.lms.deadline.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/**
 * Feign client for Submission Service.
 */
@FeignClient(name = "submission-service", url = "${services.submission.base-url:http://localhost:8083}")
public interface SubmissionClient {

    @GetMapping("/api/submissions/{submissionId}")
    SubmissionDto getSubmission(@PathVariable UUID submissionId);

    record SubmissionDto(
        UUID id,
        UUID userId,
        UUID assignmentId,
        String status,
        boolean isLate
    ) {}
}

