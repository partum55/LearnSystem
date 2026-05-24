package com.university.lms.course.assessment.dto;

import com.university.lms.course.assessment.domain.SeminarAttendanceRecordMethod;
import com.university.lms.course.assessment.domain.SeminarAttendanceRecordStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record SeminarAttendanceRecordDto(
    UUID id,
    UUID sessionId,
    UUID assignmentId,
    UUID studentId,
    String studentName,
    String studentEmail,
    SeminarAttendanceRecordStatus status,
    SeminarAttendanceRecordMethod method,
    LocalDateTime checkedInAt
) {}
