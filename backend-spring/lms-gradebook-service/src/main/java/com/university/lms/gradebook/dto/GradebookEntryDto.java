package com.university.lms.gradebook.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.university.lms.gradebook.domain.GradeStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for GradebookEntry responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradebookEntryDto {

    private UUID id;
    private UUID courseId;
    private UUID studentId;
    private String studentName;
    private String studentEmail;
    private UUID assignmentId;
    private String assignmentTitle;

    private BigDecimal score;
    private BigDecimal maxScore;
    private BigDecimal percentage;
    private GradeStatus status;

    private boolean late;
    private boolean excused;
    private String notes;

    private UUID submissionId;

    private BigDecimal overrideScore;
    private UUID overrideBy;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime overrideAt;

    private String overrideReason;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime gradedAt;

    private BigDecimal finalScore;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}

