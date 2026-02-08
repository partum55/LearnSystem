package com.university.lms.course.assessment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class SubmitPeerReviewRequest {
    @NotNull(message = "Peer review ID is required")
    private Long peerReviewId;

    @DecimalMin(value = "0.0", message = "Overall score must be non-negative")
    private Double overallScore;

    private String overallFeedback;

    @Valid
    private List<RatingInput> ratings;

    @Data
    public static class RatingInput {
        @NotNull(message = "Rubric ID is required")
        private Long rubricId;

        @NotNull(message = "Score is required")
        @DecimalMin(value = "0.0", message = "Score must be non-negative")
        private Double score;

        private String feedback;
    }
}
