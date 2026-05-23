package com.university.lms.submission.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(schema = "learning", name = "submission_versions",
    uniqueConstraints = @UniqueConstraint(name = "uq_submission_versions_submission_version",
        columnNames = {"submission_id", "version_number"}),
    indexes = {
        @Index(name = "idx_submission_versions_submission", columnList = "submission_id, version_number"),
        @Index(name = "idx_submission_versions_assignment_user", columnList = "assignment_id, user_id, version_number")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionVersion {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "submission_id", nullable = false)
  private UUID submissionId;

  @Column(name = "assignment_id", nullable = false)
  private UUID assignmentId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "version_number", nullable = false)
  private Integer versionNumber;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.NAMED_ENUM)
  @Column(nullable = false, columnDefinition = "learning.submission_status")
  private SubmissionStatus status;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> content;

  @Column(name = "submitted_at")
  private LocalDateTime submittedAt;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
