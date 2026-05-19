package com.university.lms.course.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for updating a course announcement. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAnnouncementRequest {

  @Size(max = 255, message = "Title must not exceed 255 characters")
  private String title;

  @Size(max = 10000, message = "Content must not exceed 10000 characters")
  private String content;

  private Boolean isPinned;
}
