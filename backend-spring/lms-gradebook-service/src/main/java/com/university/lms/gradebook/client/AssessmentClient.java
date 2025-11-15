package com.university.lms.gradebook.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Feign client for Assessment Service.
 */
@FeignClient(name = "assessment-service", url = "${services.assessment.base-url}")
public interface AssessmentClient {

    @GetMapping("/api/assignments/course/{courseId}")
    List<AssignmentDto> getCourseAssignments(@PathVariable("courseId") UUID courseId);

    @GetMapping("/api/assignments/{assignmentId}")
    AssignmentDto getAssignment(@PathVariable("assignmentId") UUID assignmentId);

    /**
     * DTO for assignment information.
     */
    record AssignmentDto(
            UUID id,
            String title,
            UUID courseId,
            BigDecimal maxPoints,
            String dueDate,
            UUID categoryId,
            boolean isPublished
    ) {}
}

