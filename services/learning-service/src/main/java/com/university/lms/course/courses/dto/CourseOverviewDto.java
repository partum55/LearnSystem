package com.university.lms.course.courses.dto;

import java.util.List;
import java.util.UUID;

public record CourseOverviewDto(
    UUID id,
    String title,
    String description,
    String teacherName,
    double progress,
    Double grade,
    List<UpcomingDeadlineDto> upcomingDeadlines,
    List<String> recentFeedback
) {}
