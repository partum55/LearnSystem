package com.university.lms.submission.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Request for grading submission.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeSubmissionRequest {

    @JsonAlias({"grade"})
    @DecimalMin(value = "0.0", message = "Grade must be non-negative")
    @DecimalMax(value = "999999.99", message = "Grade is too large")
    private BigDecimal score;

    @JsonAlias({"score"})
    @DecimalMin(value = "0.0", message = "Grade must be non-negative")
    @DecimalMax(value = "999999.99", message = "Grade is too large")
    private BigDecimal grade;

    private String feedback;

    @JsonAlias({"rubric_evaluation"})
    private Map<String, Object> rubricEvaluation;

    public BigDecimal resolvedGrade() {
        if (grade != null) {
            return grade;
        }
        return score;
    }
}
