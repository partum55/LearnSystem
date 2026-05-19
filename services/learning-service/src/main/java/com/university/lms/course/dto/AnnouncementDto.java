package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for course announcement responses. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementDto {

  private UUID id;
  private UUID courseId;
  private String title;
  private String content;
  private Boolean isPinned;
  private UUID createdBy;
  private UUID updatedBy;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime createdAt;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime updatedAt;
}
