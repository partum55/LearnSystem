package com.university.lms.course.assessment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request payload for creating/updating quiz sections and their rules. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertQuizSectionRequest {

  @NotBlank(message = "Section title is required")
  private String title;

  @Min(value = 0, message = "Position must be non-negative")
  @Builder.Default
  private Integer position = 0;

  @Min(value = 0, message = "Question count must be non-negative")
  @Builder.Default
  private Integer questionCount = 0;

  @Valid
  @Builder.Default
  private List<QuizSectionRuleDto> rules = new ArrayList<>();
}
