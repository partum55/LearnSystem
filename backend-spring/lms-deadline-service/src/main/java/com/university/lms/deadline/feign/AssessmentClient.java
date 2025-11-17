package com.university.lms.deadline.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Feign client for Assessment Service.
 */
@FeignClient(name = "assessment-service", url = "${services.assessment.base-url:http://localhost:8082}")
public interface AssessmentClient {

    @GetMapping("/api/assignments/course/{courseId}")
    List<AssignmentDto> getCourseAssignments(@PathVariable UUID courseId);

    record AssignmentDto(
        UUID id,
        String title,
        String description,
        UUID courseId,
        BigDecimal maxPoints,
        OffsetDateTime dueDate,
        String type,
        boolean isPublished
    ) {}
}

