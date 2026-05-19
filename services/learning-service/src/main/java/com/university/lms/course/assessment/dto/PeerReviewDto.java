package com.university.lms.course.assessment.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class PeerReviewDto {
    private UUID id;
    private UUID assignmentId;
    private UUID reviewerUserId;
    private String reviewerName; // Only shown if not anonymous
    private UUID revieweeUserId;
    private String revieweeName;
    private UUID submissionId;
    private Boolean isAnonymous;
    private String status;
    private Double overallScore;
    private String overallFeedback;
    private List<Map<String, Object>> ratings;
    private LocalDateTime submittedAt;
    private LocalDateTime createdAt;
}
