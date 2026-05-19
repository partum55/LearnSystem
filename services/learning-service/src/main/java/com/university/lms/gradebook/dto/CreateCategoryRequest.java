package com.university.lms.gradebook.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request DTO for creating/updating gradebook categories.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCategoryRequest {

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotBlank(message = "Category name is required")
    @Size(max = 100, message = "Category name must not exceed 100 characters")
    private String name;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotNull(message = "Weight is required")
    @DecimalMin(value = "0.0", message = "Weight must be non-negative")
    @DecimalMax(value = "100.0", message = "Weight cannot exceed 100%")
    private BigDecimal weight;

    @Builder.Default
    @Min(value = 0, message = "Drop lowest must be non-negative")
    private Integer dropLowest = 0;

    @Builder.Default
    @Min(value = 0, message = "Position must be non-negative")
    private Integer position = 0;
}
