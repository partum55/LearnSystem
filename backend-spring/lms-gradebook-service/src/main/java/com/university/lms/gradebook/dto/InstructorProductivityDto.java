package com.university.lms.gradebook.dto;

import lombok.Data;

/**
 * Instructor productivity metrics for administrators
 */
@Data
public class InstructorProductivityDto {
    private Long instructorId;
    private String instructorName;
    private Integer coursesTeaching;
    private Integer totalStudents;
    private Integer contentItemsCreated; // Assignments + quizzes + modules
    private Double averageGradingTime; // In hours
    private Integer assignmentsGraded;
    private Integer assignmentsPending;
    private Double responseTime; // Average time to respond to student questions (hours)
    private Double studentSatisfaction; // Average rating from students
    private Integer activeDays; // Days active in last 30 days
}
