package com.university.lms.ai.dto.persistence;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiQuestionCreateRequest {
  private String courseId;
  private String questionType;
  private String stem;
  private Map<String, Object> options;
  private Map<String, Object> correctAnswer;
  private String explanation;
  private Integer points;
}
