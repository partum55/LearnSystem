package com.university.lms.course.assessment.dto;

import com.university.lms.course.assessment.domain.SeminarAttendanceSessionStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record SeminarAttendanceSessionDto(
    UUID id,
    UUID assignmentId,
    UUID createdBy,
    SeminarAttendanceSessionStatus status,
    LocalDateTime startsAt,
    LocalDateTime expiresAt,
    LocalDateTime closedAt,
    String rawToken
) {}
