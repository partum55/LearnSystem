package com.university.lms.gradebook.dto;

public record CourseStatsDto(
    int totalStudents,
    int activeStudents,
    double averageGrade,
    double completionRate,
    int lateSubmissions,
    int pendingGrading) {}
