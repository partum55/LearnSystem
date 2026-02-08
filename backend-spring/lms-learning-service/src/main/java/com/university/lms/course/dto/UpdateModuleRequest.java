package com.university.lms.course.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for updating a module. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateModuleRequest {

  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String title;

  private String description;

  private Integer position;

  private Map<String, Object> contentMeta;

  private Boolean isPublished;

  private LocalDateTime publishDate;
}
