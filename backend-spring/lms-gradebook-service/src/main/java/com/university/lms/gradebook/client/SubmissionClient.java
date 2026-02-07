package com.university.lms.gradebook.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Feign client for Submission Service.
 */
@FeignClient(name = "submission-service", url = "${services.submission.base-url}")
public interface SubmissionClient {

    @GetMapping("/api/submissions/internal/{submissionId}")
    SubmissionDto getSubmission(@PathVariable("submissionId") UUID submissionId);

    /**
     * DTO for submission information.
     */
    record SubmissionDto(
            UUID id,
            UUID userId,
            UUID assignmentId,
            String status,
            BigDecimal grade,
            boolean isLate,
            String gradedAt
    ) {}
}
