package com.university.lms.assessment.dto;

import lombok.Data;
import java.util.List;

@Data
public class SubmitPeerReviewRequest {
    private Long peerReviewId;
    private Double overallScore;
    private String overallFeedback;
    private List<RatingInput> ratings;

    @Data
    public static class RatingInput {
        private Long rubricId;
        private Double score;
        private String feedback;
    }
}
