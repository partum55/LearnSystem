package com.university.lms.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Shared grade projection for integration endpoints.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeDto {
    private Long id;
    private String studentId;
    private String courseId;
    private String assessmentId;
    private BigDecimal score;
}

