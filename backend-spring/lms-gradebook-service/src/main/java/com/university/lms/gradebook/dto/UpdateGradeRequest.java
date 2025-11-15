package com.university.lms.gradebook.dto;

import com.university.lms.gradebook.domain.GradeStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO for updating gradebook entries (teacher/admin use).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGradeRequest {

    @DecimalMin(value = "0.0", message = "Override score must be non-negative")
    @DecimalMax(value = "999999.99", message = "Override score is too large")
    private BigDecimal overrideScore;

    private String overrideReason;

    private Boolean isExcused;

    private String notes;

    private GradeStatus status;
}

