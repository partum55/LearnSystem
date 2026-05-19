package com.university.lms.course.content.domain;

import com.university.lms.course.domain.Module;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** Module-scoped page node for hierarchical block-editor content trees. */
@Entity
@Table(
    name = "module_pages",
    indexes = {
      @Index(
          name = "idx_module_pages_module_parent_position",
          columnList = "module_id, parent_page_id, position"),
      @Index(name = "idx_module_pages_module_published", columnList = "module_id, is_published")
    },
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_module_page_slug", columnNames = {"module_id", "slug"})
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModulePage {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "module_id", nullable = false)
  private Module module;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "parent_page_id")
  private ModulePage parentPage;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(nullable = false, length = 255)
  private String slug;

  @Column(nullable = false)
  @Builder.Default
  private Integer position = 0;

  @Column(name = "is_published", nullable = false)
  @Builder.Default
  private Boolean isPublished = false;

  @Column(name = "has_unpublished_changes", nullable = false)
  @Builder.Default
  private Boolean hasUnpublishedChanges = false;

  @Column(name = "created_by", nullable = false)
  private UUID createdBy;

  @Column(name = "updated_by", nullable = false)
  private UUID updatedBy;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;
}
