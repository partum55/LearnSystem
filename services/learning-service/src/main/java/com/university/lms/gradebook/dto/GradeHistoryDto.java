package com.university.lms.gradebook.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for GradeHistory responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeHistoryDto {

    private UUID id;
    private UUID gradebookEntryId;
    private BigDecimal oldScore;
    private BigDecimal newScore;
    private UUID changedBy;
    private String changedByName;
    private String changeReason;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime changedAt;
}

