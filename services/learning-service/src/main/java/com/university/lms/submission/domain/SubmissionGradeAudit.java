package com.university.lms.submission.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Internal audit record for score/feedback mutations on a submission.
 */
@Entity
@Table(
    name = "submission_grade_audit",
    indexes = {
      @Index(name = "idx_submission_grade_audit_submission", columnList = "submission_id, changed_at")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionGradeAudit {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "submission_id", nullable = false)
  private UUID submissionId;

  @Column(name = "changed_by", nullable = false)
  private UUID changedBy;

  @Column(name = "change_type", nullable = false, length = 32)
  private String changeType;

  @Column(name = "prev_raw_score", precision = 6, scale = 2)
  private BigDecimal prevRawScore;

  @Column(name = "new_raw_score", precision = 6, scale = 2)
  private BigDecimal newRawScore;

  @Column(name = "prev_final_score", precision = 6, scale = 2)
  private BigDecimal prevFinalScore;

  @Column(name = "new_final_score", precision = 6, scale = 2)
  private BigDecimal newFinalScore;

  @Column(name = "prev_feedback", columnDefinition = "TEXT")
  private String prevFeedback;

  @Column(name = "new_feedback", columnDefinition = "TEXT")
  private String newFeedback;

  @Column(name = "submission_version", nullable = false)
  @Builder.Default
  private Integer submissionVersion = 1;

  @Column(name = "entity_version", nullable = false)
  @Builder.Default
  private Long entityVersion = 0L;

  @CreationTimestamp
  @Column(name = "changed_at", nullable = false, updatable = false)
  private LocalDateTime changedAt;
}
