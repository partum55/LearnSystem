package com.university.lms.gradebook.dto;

import lombok.Data;
import java.util.Map;

/**
 * Platform-wide usage statistics for administrators
 */
@Data
public class PlatformUsageDto {
    private Long totalUsers;
    private Long activeUsers; // Users active in last 30 days
    private Long totalInstructors;
    private Long totalStudents;
    private Long totalCourses;
    private Long activeCourses;
    private Long totalEnrollments;
    private Long totalAssignments;
    private Long totalQuizzes;
    private Long totalSubmissions;
    private Map<String, Long> usersByRole;
    private Map<String, Long> coursesByStatus;
    private Map<String, Double> engagementMetrics;
}
