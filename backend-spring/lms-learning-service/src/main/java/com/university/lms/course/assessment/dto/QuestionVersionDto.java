package com.university.lms.course.assessment.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for immutable question versions. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionVersionDto {

  private UUID id;
  private UUID questionId;
  private Integer versionNumber;
  private Map<String, Object> promptDocJson;
  private Map<String, Object> payloadJson;
  private Map<String, Object> answerKeyJson;
  private UUID createdBy;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime createdAt;
}
