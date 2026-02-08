package com.university.lms.course.assessment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PeerReviewRubricDto {
    private Long id;
    private Long assignmentId;

    @NotBlank(message = "Criterion name is required")
    private String criterionName;

    private String criterionDescription;

    @NotNull(message = "Max points is required")
    @Min(value = 1, message = "Max points must be at least 1")
    private Integer maxPoints;

    @NotNull(message = "Position is required")
    @Min(value = 0, message = "Position must be non-negative")
    private Integer position;
}
