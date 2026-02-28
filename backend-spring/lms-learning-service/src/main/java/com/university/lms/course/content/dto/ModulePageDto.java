package com.university.lms.course.content.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Module page tree node DTO. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModulePageDto {

  private UUID id;
  private UUID moduleId;
  private UUID parentPageId;
  private String title;
  private String slug;
  private Integer position;
  private Boolean isPublished;
  private Boolean hasUnpublishedChanges;
  private UUID createdBy;
  private UUID updatedBy;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
