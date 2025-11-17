package com.university.lms.assessment.dto;

import lombok.Data;

@Data
public class PeerReviewRubricDto {
    private Long id;
    private Long assignmentId;
    private String criterionName;
    private String criterionDescription;
    private Integer maxPoints;
    private Integer position;
}
