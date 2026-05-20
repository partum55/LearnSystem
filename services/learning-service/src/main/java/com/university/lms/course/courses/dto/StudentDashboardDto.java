package com.university.lms.course.courses.dto;

import java.util.List;

public record StudentDashboardDto(
    long activeCourseCount,
    long upcomingDeadlineCount,
    long pendingSubmissionCount,
    List<CourseSummaryDto> activeCourses,
    List<UpcomingDeadlineDto> upcomingDeadlines
) {}
