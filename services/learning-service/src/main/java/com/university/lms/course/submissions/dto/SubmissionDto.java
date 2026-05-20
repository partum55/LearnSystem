package com.university.lms.course.submissions.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record SubmissionDto(
    UUID id,
    UUID assignmentId,
    UUID studentId,
    String status,
    LocalDateTime submittedAt,
    int version
) {}
