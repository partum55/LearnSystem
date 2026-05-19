package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Per-question response captured for a quiz attempt question snapshot. */
@Entity
@Table(
    name = "quiz_responses",
    indexes = {@Index(name = "idx_quiz_responses_attempt", columnList = "attempt_id")},
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_quiz_response_attempt_question", columnNames = {"attempt_question_id"})
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizResponseEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "attempt_id", nullable = false)
  private QuizAttempt attempt;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "attempt_question_id", nullable = false)
  private QuizAttemptQuestion attemptQuestion;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "response_jsonb", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> responseJson = new HashMap<>();

  @Column(name = "is_correct")
  private Boolean isCorrect;

  @Column(name = "score_awarded", precision = 6, scale = 2)
  private BigDecimal scoreAwarded;

  @Column(columnDefinition = "TEXT")
  private String feedback;

  @Column(name = "graded_at")
  private LocalDateTime gradedAt;
}
