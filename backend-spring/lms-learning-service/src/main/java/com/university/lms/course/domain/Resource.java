package com.university.lms.course.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * Course resource entity (files, videos, links, etc.). Supports various resource types with
 * flexible metadata.
 */
@Entity
@Table(
    name = "resources",
    indexes = {
      @Index(name = "idx_resource_module", columnList = "module_id"),
      @Index(name = "idx_resource_type", columnList = "resource_type")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resource {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "module_id", nullable = false)
  private Module module;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "resource_type", nullable = false, length = 20)
  private String resourceType; // VIDEO, PDF, SLIDE, LINK, TEXT, CODE, OTHER

  @Column(name = "file_url", length = 500)
  private String fileUrl; // For uploaded files (S3/MinIO URL)

  @Column(name = "external_url", length = 500)
  private String externalUrl; // For external links

  @Column(name = "file_size")
  private Long fileSize; // File size in bytes

  @Column(name = "mime_type", length = 100)
  private String mimeType;

  @Column(nullable = false)
  @Builder.Default
  private Integer position = 0;

  @Column(name = "is_downloadable", nullable = false)
  @Builder.Default
  private Boolean isDownloadable = true;

  // Text content for TEXT type resources
  @Column(name = "text_content", columnDefinition = "TEXT")
  private String textContent;

  // Flexible metadata storage
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "metadata", columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> metadata = new HashMap<>();

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  // Helper methods
  public boolean isFile() {
    return fileUrl != null && !fileUrl.isBlank();
  }

  public boolean isExternalLink() {
    return externalUrl != null && !externalUrl.isBlank();
  }

  public boolean isTextContent() {
    return "TEXT".equals(resourceType) || "CODE".equals(resourceType);
  }

  public String getResourceUrl() {
    if (isFile()) {
      return fileUrl;
    }
    if (isExternalLink()) {
      return externalUrl;
    }
    return null;
  }
}
