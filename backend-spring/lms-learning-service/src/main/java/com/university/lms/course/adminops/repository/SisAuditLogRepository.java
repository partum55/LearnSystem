package com.university.lms.course.adminops.repository;

import com.university.lms.course.adminops.domain.SisAuditLog;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SisAuditLogRepository extends JpaRepository<SisAuditLog, UUID> {

  @Query(
      "SELECT l FROM SisAuditLog l "
          + "WHERE (:importRunId IS NULL OR l.importRunId = :importRunId) "
          + "AND (:action IS NULL OR l.action = :action) "
          + "AND (:entityType IS NULL OR l.entityType = :entityType) "
          + "ORDER BY l.createdAt DESC")
  Page<SisAuditLog> search(
      @Param("importRunId") UUID importRunId,
      @Param("action") String action,
      @Param("entityType") String entityType,
      Pageable pageable);
}
