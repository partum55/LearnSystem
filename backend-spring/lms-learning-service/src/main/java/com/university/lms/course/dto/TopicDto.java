package com.university.lms.course.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for Topic responses. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopicDto {

  private UUID id;
  private UUID moduleId;
  private String title;
  private String description;
  private Integer position;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
