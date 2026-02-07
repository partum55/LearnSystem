package com.university.lms.submission.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Feign client for Assessment Service.
 */
@FeignClient(name = "assessment-service", url = "${services.assessment.base-url:http://localhost:8083}")
public interface AssessmentClient {

    @GetMapping("/api/assignments/{assignmentId}")
    AssignmentDto getAssignment(@PathVariable("assignmentId") UUID assignmentId);

    record AssignmentDto(
            UUID id,
            UUID courseId,
            BigDecimal maxPoints,
            LocalDateTime dueDate,
            Boolean allowLateSubmission
    ) {
    }
}
