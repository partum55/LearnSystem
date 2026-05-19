package com.university.lms.gradebook.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * Student engagement metrics for risk prediction
 */
@Data
public class StudentEngagementDto {
    private Long studentId;
    private Long courseId;
    private Integer loginCount;
    private LocalDateTime lastLogin;
    private Integer daysInactive;
    private Integer assignmentsCompleted;
    private Integer assignmentsTotal;
    private Integer quizzesCompleted;
    private Integer quizzesTotal;
    private Double averageSubmissionTime; // Hours before deadline
    private Integer lateSubmissions;
    private Double forumParticipation; // Posts + comments
    private Double resourceAccessCount; // Videos watched, readings opened
    private Double currentGrade;
    private Double gradeChange; // Change in last 2 weeks
}
