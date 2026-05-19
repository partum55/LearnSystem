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
 * DTO for GradebookCategory responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradebookCategoryDto {

    private UUID id;
    private UUID courseId;
    private String name;
    private String description;
    private BigDecimal weight;
    private Integer dropLowest;
    private Integer position;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}

