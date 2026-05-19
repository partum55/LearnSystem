package com.university.lms.course.assessment.document.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/** Canonical assignment starter document authored by instructors. */
@Entity
@Table(name = "assignment_template_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentTemplateDocument {

  @Id
  @Column(name = "assignment_id", nullable = false)
  private UUID assignmentId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "doc_json", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> docJson = new HashMap<>();

  @Column(name = "schema_version", nullable = false)
  @Builder.Default
  private Integer schemaVersion = 1;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Column(name = "updated_by", nullable = false)
  private UUID updatedBy;
}
