package com.university.lms.course.courses.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record UpcomingDeadlineDto(
    UUID assignmentId,
    UUID courseId,
    String courseTitle,
    String title,
    String type,
    LocalDateTime dueDate
) {}
