package com.university.lms.assessment.dto;

import lombok.Data;

@Data
public class PeerReviewRatingDto {
    private Long id;
    private Long peerReviewId;
    private Long rubricId;
    private String criterionName;
    private Double score;
    private String feedback;
}
