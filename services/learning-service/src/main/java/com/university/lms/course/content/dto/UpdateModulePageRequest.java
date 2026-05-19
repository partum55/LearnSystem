package com.university.lms.course.content.dto;

import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request for updating module page metadata and hierarchy. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateModulePageRequest {

  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String title;

  @Size(max = 255, message = "Slug must not exceed 255 characters")
  private String slug;

  private UUID parentPageId;

  private Integer position;
}
