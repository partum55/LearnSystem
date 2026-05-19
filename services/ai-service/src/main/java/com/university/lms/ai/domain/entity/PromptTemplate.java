package com.university.lms.ai.domain.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

/**
 * Entity for storing versioned prompt templates. Enables dynamic prompt management without code
 * deployment.
 */
@Entity
@Table(
    name = "prompt_templates",
    indexes = {@Index(name = "idx_prompt_name_active", columnList = "name, active")})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromptTemplate {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  /** Unique template name (e.g., "course.generation.v2", "quiz.creation") */
  @Column(nullable = false, unique = true, length = 100)
  private String name;

  /** Human-readable description of the template */
  @Column(length = 500)
  private String description;

  /** System prompt for context setting */
  @Column(columnDefinition = "TEXT", nullable = false)
  private String systemPrompt;

  /** User prompt template with {{placeholders}} for variable interpolation */
  @Column(columnDefinition = "TEXT", nullable = false)
  private String userPromptTemplate;

  /** Optimistic locking version */
  @Version private Integer version;

  /** Whether this template is active and available for use */
  @Builder.Default private boolean active = true;

  /** Category for organizing templates */
  @Column(length = 50)
  @Builder.Default
  private String category = "general";

  /** Model to use for this template (optional, uses default if null) */
  @Column(length = 100)
  private String preferredModel;

  /** Temperature setting for this template */
  @Builder.Default private Double temperature = 0.7;

  /** Max tokens for this template */
  @Builder.Default private Integer maxTokens = 4000;

  /** Created timestamp */
  @Column(name = "created_at", updatable = false)
  private Instant createdAt;

  /** Last updated timestamp */
  @Column(name = "updated_at")
  private Instant updatedAt;

  /** User who created/modified this template */
  @Column(name = "modified_by", length = 100)
  private String modifiedBy;

  @PrePersist
  protected void onCreate() {
    createdAt = Instant.now();
    updatedAt = Instant.now();
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = Instant.now();
  }
}
