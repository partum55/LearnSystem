package com.university.lms.course.assignments.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record StudentAssignmentStateDto(
    String status,
    UUID submissionId,
    UUID latestAttemptId,
    LocalDateTime submittedAt,
    GradePreviewDto grade,
    boolean canSubmit,
    boolean canEdit,
    boolean canDelete,
    boolean canResubmit,
    boolean canStartNewAttempt,
    Integer attemptsUsed,
    Integer attemptLimit
) {}
