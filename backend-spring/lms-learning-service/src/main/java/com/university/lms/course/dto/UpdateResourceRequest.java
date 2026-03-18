package com.university.lms.course.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for updating a resource. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateResourceRequest {

  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String title;

  private String description;

  private UUID topicId;

  @Pattern(
      regexp = "^(VIDEO|PDF|SLIDE|LINK|TEXT|CODE|OTHER)$",
      message = "Resource type must be VIDEO, PDF, SLIDE, LINK, TEXT, CODE, or OTHER")
  private String resourceType;

  @Size(max = 500, message = "File URL must not exceed 500 characters")
  private String fileUrl;

  @Size(max = 500, message = "External URL must not exceed 500 characters")
  private String externalUrl;

  private Long fileSize;

  @Size(max = 100, message = "MIME type must not exceed 100 characters")
  private String mimeType;

  private Integer position;

  private Boolean isDownloadable;

  private String textContent;

  private Map<String, Object> metadata;
}
