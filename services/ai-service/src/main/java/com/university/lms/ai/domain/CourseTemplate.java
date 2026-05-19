package com.university.lms.ai.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** Entity for AI course generation templates */
@Entity
@Table(name = "ai_course_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseTemplate {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Column(length = 1000)
  private String description;

  @Column(nullable = false)
  private String category; // "programming", "math", "languages", "science", "business"

  @Column(columnDefinition = "TEXT", nullable = false)
  private String promptTemplate;

  @ElementCollection
  @CollectionTable(name = "template_variables", joinColumns = @JoinColumn(name = "template_id"))
  @MapKeyColumn(name = "variable_name")
  @Column(name = "default_value")
  @Builder.Default
  private Map<String, String> variables = new HashMap<>();

  @ElementCollection
  @CollectionTable(name = "template_options", joinColumns = @JoinColumn(name = "template_id"))
  @MapKeyColumn(name = "option_key")
  @Column(name = "option_value")
  @Builder.Default
  private Map<String, String> defaultOptions = new HashMap<>();

  @Column(nullable = false)
  @Builder.Default
  private Boolean isPublic = true;

  @Column(nullable = false)
  @Builder.Default
  private Boolean isActive = true;

  private UUID createdBy;

  @Column(nullable = false)
  @Builder.Default
  private Integer usageCount = 0;

  @Column(nullable = false)
  @Builder.Default
  private Double averageRating = 0.0;

  @CreationTimestamp private LocalDateTime createdAt;

  @UpdateTimestamp private LocalDateTime updatedAt;

  public void incrementUsage() {
    this.usageCount++;
  }
}
