package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

/** Selector rule inside quiz sections (tag/difficulty/type + quota). */
@Entity
@Table(
    name = "quiz_section_rules",
    indexes = {@Index(name = "idx_quiz_section_rules_section", columnList = "section_id")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizSectionRule {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "section_id", nullable = false)
  private QuizSection section;

  @Column(name = "question_type", length = 30)
  private String questionType;

  @Column(length = 20)
  private String difficulty;

  @Column(length = 120)
  private String tag;

  @Column(nullable = false)
  @Builder.Default
  private Integer quota = 1;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
