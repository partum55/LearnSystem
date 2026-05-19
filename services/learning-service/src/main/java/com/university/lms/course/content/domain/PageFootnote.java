package com.university.lms.course.content.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Indexed footnote records extracted from canonical page documents. */
@Entity
@Table(
    name = "page_footnotes",
    indexes = {
      @Index(name = "idx_page_footnotes_page", columnList = "page_id"),
      @Index(name = "idx_page_footnotes_ordinal", columnList = "page_id, ordinal")
    },
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_page_footnote_key", columnNames = {"page_id", "footnote_key"})
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageFootnote {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "page_id", nullable = false)
  private ModulePage page;

  @Column(name = "footnote_key", nullable = false, length = 128)
  private String footnoteKey;

  @Column(nullable = false)
  private Integer ordinal;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "content_json", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> contentJson = new HashMap<>();

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
