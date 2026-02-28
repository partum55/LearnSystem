package com.university.lms.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for creating a course announcement. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAnnouncementRequest {

  @NotBlank(message = "Title is required")
  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String title;

  @NotBlank(message = "Content is required")
  @Size(max = 10000, message = "Content must not exceed 10000 characters")
  private String content;

  private Boolean isPinned;
}
