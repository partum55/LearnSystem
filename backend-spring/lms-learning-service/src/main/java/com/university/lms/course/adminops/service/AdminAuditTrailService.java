package com.university.lms.course.adminops.service;

import com.university.lms.course.adminops.domain.SisAuditLog;
import com.university.lms.course.adminops.repository.SisAuditLogRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Shared audit trail service for admin-sensitive operations outside SIS import flow.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuditTrailService {

  private final SisAuditLogRepository sisAuditLogRepository;

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void log(
      UUID actorId,
      String action,
      String entityType,
      String entityKey,
      Map<String, Object> details) {
    if (actorId == null || action == null || action.isBlank() || entityType == null || entityType.isBlank()) {
      return;
    }

    try {
      SisAuditLog logEntry =
          SisAuditLog.builder()
              .importRunId(null)
              .actorId(actorId)
              .action(action)
              .entityType(entityType)
              .entityKey(entityKey)
              .details(details == null ? Map.of() : new LinkedHashMap<>(details))
              .build();
      sisAuditLogRepository.save(logEntry);
    } catch (Exception exception) {
      log.warn(
          "Failed to persist admin audit log action={} entityType={} entityKey={}",
          action,
          entityType,
          entityKey,
          exception);
    }
  }
}
