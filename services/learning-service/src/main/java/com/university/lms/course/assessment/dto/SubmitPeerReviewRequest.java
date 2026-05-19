package com.university.lms.course.assessment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class SubmitPeerReviewRequest {
    @NotNull(message = "Peer review ID is required")
    private UUID peerReviewId;

    @DecimalMin(value = "0.0", message = "Overall score must be non-negative")
    private Double overallScore;

    private String overallFeedback;
}
