package com.university.lms.course.assessment.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Security/focus violation event captured during quiz taking.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptViolationRequest {
  private String type;
  private Map<String, Object> details;
}
