package com.university.lms.gradebook.dto;

import lombok.Data;

/**
 * Course effectiveness metrics for administrators
 */
@Data
public class CourseEffectivenessDto {
    private Long courseId;
    private String courseCode;
    private String courseTitle;
    private Integer totalStudents;
    private Integer activeStudents;
    private Double completionRate; // Percentage
    private Double averageGrade;
    private Double passRate; // Percentage of students passing
    private Integer totalAssignments;
    private Integer totalQuizzes;
    private Double averageSubmissionRate;
    private Double studentSatisfaction; // 0-5 scale
    private String status;
}
