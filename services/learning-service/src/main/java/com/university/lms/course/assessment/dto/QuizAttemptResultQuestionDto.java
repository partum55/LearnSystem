package com.university.lms.course.assessment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for a single graded response entry within an attempt result payload. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptResultQuestionDto {

  private UUID attemptQuestionId;
  private UUID questionId;
  private UUID questionVersionId;
  private Integer position;
  private BigDecimal points;
  private Map<String, Object> promptSnapshot;
  private Map<String, Object> payloadSnapshot;

  private Map<String, Object> response;
  private Boolean correct;
  private BigDecimal scoreAwarded;
  private String feedback;
  private LocalDateTime gradedAt;
}
