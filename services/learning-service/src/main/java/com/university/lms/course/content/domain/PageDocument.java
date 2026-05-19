package com.university.lms.course.content.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/** Canonical draft document storage for a module page. */
@Entity
@Table(name = "page_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageDocument {

  @Id private UUID pageId;

  @OneToOne(fetch = FetchType.LAZY)
  @MapsId
  @JoinColumn(name = "page_id")
  private ModulePage page;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "doc_json", nullable = false, columnDefinition = "jsonb")
  @Builder.Default
  private Map<String, Object> docJson = new HashMap<>();

  @Column(name = "schema_version", nullable = false)
  @Builder.Default
  private Integer schemaVersion = 1;

  @Column(name = "doc_hash", nullable = false, length = 64)
  private String docHash;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;
}
