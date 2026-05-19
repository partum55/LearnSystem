package com.university.lms.course.assessment.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class PeerReviewDto {
    private Long id;
    private Long assignmentId;
    private Long reviewerUserId;
    private String reviewerName; // Only shown if not anonymous
    private Long revieweeUserId;
    private String revieweeName;
    private Long submissionId;
    private Boolean isAnonymous;
    private String status;
    private Double overallScore;
    private String overallFeedback;
    private List<Map<String, Object>> ratings;
    private LocalDateTime submittedAt;
    private LocalDateTime createdAt;
}
