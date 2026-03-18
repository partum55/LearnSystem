package com.university.lms.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for archived-course snapshot payload. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseArchiveSnapshotDto {
  private UUID snapshotId;
  private UUID courseId;
  private int version;
  private UUID createdBy;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
  private LocalDateTime createdAt;

  @Builder.Default private Map<String, Object> payload = new HashMap<>();
}
