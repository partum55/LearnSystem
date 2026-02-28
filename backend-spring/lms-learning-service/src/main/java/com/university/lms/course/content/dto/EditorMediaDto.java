package com.university.lms.course.content.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

/** Upload response payload for editor media assets. */
@Value
@Builder
public class EditorMediaDto {
  UUID id;
  String url;
  String fileName;
  String contentType;
  Long size;
  LocalDateTime createdAt;
}
