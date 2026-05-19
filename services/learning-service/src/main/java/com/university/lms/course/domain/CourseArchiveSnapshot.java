package com.university.lms.course.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Immutable archived-course content snapshot. */
@Entity
@Table(
    name = "course_archive_snapshots",
    indexes = {
      @Index(name = "idx_archive_course_id", columnList = "course_id"),
      @Index(name = "idx_archive_created_at", columnList = "created_at")
    },
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_archive_course_version", columnNames = {"course_id", "version"})
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseArchiveSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "course_id", nullable = false)
  private UUID courseId;

  @Column(nullable = false)
  private Integer version;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "created_by", nullable = false)
  private UUID createdBy;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> payload = new HashMap<>();
}
