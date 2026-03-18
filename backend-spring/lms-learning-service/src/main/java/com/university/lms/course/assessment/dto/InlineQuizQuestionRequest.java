package com.university.lms.course.assessment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Inline question draft used when creating/updating quiz assignments from the wizard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InlineQuizQuestionRequest {

  @NotBlank
  private String questionType;

  @NotBlank
  private String stem;

  private Map<String, Object> promptDocument;

  @Builder.Default
  private Map<String, Object> options = Map.of();

  @Builder.Default
  private Map<String, Object> correctAnswer = Map.of();

  private String explanation;

  @NotNull
  @DecimalMin("0.01")
  @Builder.Default
  private BigDecimal points = BigDecimal.ONE;

  @Builder.Default
  private Map<String, Object> metadata = Map.of();
}
