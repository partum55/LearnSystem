package com.university.lms.course.content.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

/** Indexed citation metadata extracted from canonical page documents. */
@Entity
@Table(
    name = "page_citations",
    indexes = {
      @Index(name = "idx_page_citations_page", columnList = "page_id"),
      @Index(name = "idx_page_citations_type", columnList = "citation_type")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageCitation {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "page_id", nullable = false)
  private ModulePage page;

  @Column(name = "block_id", length = 128)
  private String blockId;

  @Column(length = 255)
  private String author;

  @Column(length = 512)
  private String title;

  @Column(name = "year")
  private Integer year;

  @Column(length = 1000)
  private String url;

  @Column(name = "citation_type", length = 50)
  private String citationType;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
