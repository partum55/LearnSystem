package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Immutable version snapshot for question-bank entries. */
@Entity
@Table(
    name = "question_bank_versions",
    indexes = {@Index(name = "idx_question_versions_question", columnList = "question_id, version_number DESC")},
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_question_version", columnNames = {"question_id", "version_number"})
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionVersion {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "question_id", nullable = false)
  private QuestionBank question;

  @Column(name = "version_number", nullable = false)
  private Integer versionNumber;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "prompt_doc_json", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> promptDocJson = new HashMap<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "payload_jsonb", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> payloadJson = new HashMap<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "answer_key_jsonb", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> answerKeyJson = new HashMap<>();

  @Column(name = "created_by", nullable = false)
  private UUID createdBy;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
