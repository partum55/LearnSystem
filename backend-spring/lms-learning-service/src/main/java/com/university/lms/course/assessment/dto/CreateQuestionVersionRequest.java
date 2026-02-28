package com.university.lms.course.assessment.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Optional payload for creating explicit question versions. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuestionVersionRequest {

  @NotNull(message = "promptDocJson is required")
  private Map<String, Object> promptDocJson;

  @Builder.Default
  private Map<String, Object> payloadJson = Map.of();

  @Builder.Default
  private Map<String, Object> answerKeyJson = Map.of();
}
