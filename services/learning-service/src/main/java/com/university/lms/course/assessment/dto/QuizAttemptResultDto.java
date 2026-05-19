package com.university.lms.course.assessment.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for an attempt result summary including per-question grading details. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptResultDto {

  private QuizAttemptDto attempt;
  private BigDecimal totalPoints;
  private BigDecimal earnedPoints;
  private List<QuizAttemptResultQuestionDto> questions;
}
