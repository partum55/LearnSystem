package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Frozen question snapshot selected at attempt start. */
@Entity
@Table(
    name = "quiz_attempt_questions",
    indexes = {
      @Index(name = "idx_quiz_attempt_questions_attempt", columnList = "attempt_id, position"),
      @Index(name = "idx_quiz_attempt_questions_question", columnList = "question_id")
    },
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_attempt_question_position", columnNames = {"attempt_id", "position"})
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttemptQuestion {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "attempt_id", nullable = false)
  private QuizAttempt attempt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "question_id", nullable = false)
  private QuestionBank question;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "question_version_id")
  private QuestionVersion questionVersion;

  @Column(nullable = false)
  @Builder.Default
  private Integer position = 0;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "prompt_snapshot", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> promptSnapshot = new HashMap<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "payload_snapshot", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> payloadSnapshot = new HashMap<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "answer_key_snapshot", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> answerKeySnapshot = new HashMap<>();

  @Column(nullable = false, precision = 6, scale = 2)
  @Builder.Default
  private BigDecimal points = BigDecimal.ONE;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
