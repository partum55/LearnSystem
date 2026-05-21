package com.university.lms.course.materials.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
    schema = "learning",
    name = "lesson_blocks",
    indexes = {
      @Index(name = "idx_lesson_blocks_item_position", columnList = "learning_item_id, position"),
      @Index(name = "idx_lesson_blocks_type", columnList = "type")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonBlock {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "learning_item_id", nullable = false)
  private LearningItem learningItem;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private LessonBlockType type;

  @Column(length = 255)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String content;

  @Column(name = "content_format", nullable = false, length = 20)
  @Builder.Default
  private String contentFormat = "RICH";

  @Column(nullable = false)
  @Builder.Default
  private Integer position = 0;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> settings = new HashMap<>();

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;
}
