package com.university.lms.course.content.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

/** Metadata for files uploaded by the canonical editor (image/pdf). */
@Entity
@Table(
    name = "editor_media",
    indexes = {
      @Index(name = "idx_editor_media_uploaded_by_created_at", columnList = "uploaded_by, created_at")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditorMedia {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "stored_filename", nullable = false, length = 255, unique = true)
  private String storedFilename;

  @Column(name = "original_filename", nullable = false, length = 255)
  private String originalFilename;

  @Column(name = "storage_path", nullable = false, length = 1200)
  private String storagePath;

  @Column(name = "content_type", nullable = false, length = 120)
  private String contentType;

  @Column(name = "file_size", nullable = false)
  private Long fileSize;

  @Column(name = "uploaded_by", nullable = false)
  private UUID uploadedBy;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
