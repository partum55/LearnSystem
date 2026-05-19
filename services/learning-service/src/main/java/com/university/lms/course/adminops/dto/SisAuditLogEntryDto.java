package com.university.lms.course.adminops.dto;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisAuditLogEntryDto {
  private UUID id;
  private UUID importRunId;
  private UUID actorId;
  private String action;
  private String entityType;
  private String entityKey;
  private Map<String, Object> details;
  private LocalDateTime createdAt;
}
