package com.university.lms.ai.domain.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

/** Entity for tracking A/B test results for prompts. */
@Entity
@Table(
    name = "ai_prompt_ab_test",
    indexes = {
      @Index(name = "idx_ab_test_experiment", columnList = "experiment_name"),
      @Index(name = "idx_ab_test_variant", columnList = "variant_name"),
      @Index(name = "idx_ab_test_created", columnList = "created_at")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromptABTest {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  /** Name of the experiment */
  @Column(name = "experiment_name", nullable = false, length = 100)
  private String experimentName;

  /** Variant being tested (A, B, control, etc.) */
  @Column(name = "variant_name", nullable = false, length = 50)
  private String variantName;

  /** Name of the prompt template used */
  @Column(name = "prompt_template_name", nullable = false, length = 100)
  private String promptTemplateName;

  /** User ID (for user-level analysis) */
  @Column(name = "user_id", length = 36)
  private String userId;

  /** Whether generation was successful */
  @Column(nullable = false)
  private boolean success;

  /** Response latency in milliseconds */
  @Column(name = "latency_ms")
  private Long latencyMs;

  /** Total tokens used */
  @Column(name = "total_tokens")
  private Integer totalTokens;

  /** Quality score (0-100, if available from evaluation) */
  @Column(name = "quality_score")
  private Integer qualityScore;

  /** User rating (1-5 stars, if provided) */
  @Column(name = "user_rating")
  private Integer userRating;

  /** Additional metadata (JSON) */
  @Column(columnDefinition = "TEXT")
  private String metadata;

  /** Creation timestamp */
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  protected void onCreate() {
    createdAt = Instant.now();
  }
}
