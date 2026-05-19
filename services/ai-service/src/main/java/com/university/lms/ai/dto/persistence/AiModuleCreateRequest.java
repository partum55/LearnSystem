package com.university.lms.ai.dto.persistence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModuleCreateRequest {
  private String courseId;
  private String title;
  private String description;
  private Integer position;
  private boolean isPublished;
}
