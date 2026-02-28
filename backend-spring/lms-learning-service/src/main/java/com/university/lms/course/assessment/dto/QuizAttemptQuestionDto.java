package com.university.lms.course.assessment.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for frozen question snapshot returned to quiz-taking clients. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptQuestionDto {

  private UUID id;
  private UUID attemptId;
  private UUID questionId;
  private UUID questionVersionId;
  private Integer position;
  private BigDecimal points;
  private Map<String, Object> promptSnapshot;
  private Map<String, Object> payloadSnapshot;
}
