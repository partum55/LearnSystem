package com.university.lms.course.adminops.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/** Stores SIS import preview/apply/rollback state and payloads. */
@Entity
@Table(name = "sis_import_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SisImportRun {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "semester_code", nullable = false, length = 40)
  private String semesterCode;

  @Column(name = "status", nullable = false, length = 30)
  private String status;

  @Column(name = "requested_by", nullable = false)
  private UUID requestedBy;

  @Column(name = "valid", nullable = false)
  @Builder.Default
  private boolean valid = false;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "preview_summary", columnDefinition = "jsonb", nullable = false)
  @Builder.Default
  private Map<String, Object> previewSummary = new HashMap<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "row_errors", columnDefinition = "jsonb", nullable = false)
  @Builder.Default
  private List<Map<String, Object>> rowErrors = new ArrayList<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "warnings", columnDefinition = "jsonb", nullable = false)
  @Builder.Default
  private List<String> warnings = new ArrayList<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "change_set", columnDefinition = "jsonb", nullable = false)
  @Builder.Default
  private List<Map<String, Object>> changeSet = new ArrayList<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "apply_report", columnDefinition = "jsonb", nullable = false)
  @Builder.Default
  private Map<String, Object> applyReport = new HashMap<>();

  @Column(name = "applied_at")
  private LocalDateTime appliedAt;

  @Column(name = "rollback_expires_at")
  private LocalDateTime rollbackExpiresAt;

  @Column(name = "rolled_back_at")
  private LocalDateTime rolledBackAt;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;
}
