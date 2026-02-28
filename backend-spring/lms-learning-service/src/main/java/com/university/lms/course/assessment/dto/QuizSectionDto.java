package com.university.lms.course.assessment.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for quiz randomization section definitions. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizSectionDto {

  private UUID id;
  private UUID quizId;
  private String title;
  private Integer position;
  private Integer questionCount;

  @Builder.Default
  private List<QuizSectionRuleDto> rules = new ArrayList<>();
}
