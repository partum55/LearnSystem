package com.university.lms.course.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * Course module/section for organizing content. Supports hierarchical content organization with
 * metadata.
 */
@Entity
@Table(
    name = "modules",
    indexes = {@Index(name = "idx_module_course_position", columnList = "course_id, position")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Module {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(nullable = false)
  @Builder.Default
  private Integer position = 0;

  // Flexible metadata storage for content customization
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "content_meta", columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> contentMeta = new HashMap<>();

  @Column(name = "is_published", nullable = false)
  @Builder.Default
  private Boolean isPublished = false;

  @Column(name = "publish_date")
  private LocalDateTime publishDate;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  // Relationships
  @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("position ASC")
  @Builder.Default
  private Set<Resource> resources = new HashSet<>();

  // Helper methods
  public boolean isAvailable() {
    if (!Boolean.TRUE.equals(isPublished)) {
      return false;
    }
    if (publishDate == null) {
      return true;
    }
    return !LocalDateTime.now().isBefore(publishDate);
  }

  public void addResource(Resource resource) {
    resources.add(resource);
    resource.setModule(this);
  }

  public void removeResource(Resource resource) {
    resources.remove(resource);
    resource.setModule(null);
  }
}
