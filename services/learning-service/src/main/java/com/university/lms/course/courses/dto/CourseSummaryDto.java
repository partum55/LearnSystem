package com.university.lms.course.courses.dto;

import java.util.UUID;

public record CourseSummaryDto(
    UUID id,
    String title,
    String description,
    String status,
    String teacherName,
    double progress,
    Double grade
) {}
