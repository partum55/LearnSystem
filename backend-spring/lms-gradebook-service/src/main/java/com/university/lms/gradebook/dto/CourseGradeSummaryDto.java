package com.university.lms.gradebook.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for CourseGradeSummary responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseGradeSummaryDto {

    private UUID id;
    private UUID courseId;
    private UUID studentId;
    private String studentName;
    private String studentEmail;

    private BigDecimal totalPointsEarned;
    private BigDecimal totalPointsPossible;
    private BigDecimal currentGrade;
    private String letterGrade;

    private Map<String, Object> categoryGrades;

    private Integer assignmentsCompleted;
    private Integer assignmentsTotal;
    private BigDecimal completionPercentage;

    private BigDecimal finalGrade;
    private boolean finalized;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastCalculated;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}

