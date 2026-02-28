package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** Section definition for quota-based randomized quiz question selection. */
@Entity
@Table(
    name = "quiz_sections",
    indexes = {
      @Index(name = "idx_quiz_sections_quiz_position", columnList = "quiz_id, position")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizSection {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "quiz_id", nullable = false)
  private Quiz quiz;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(nullable = false)
  @Builder.Default
  private Integer position = 0;

  @Column(name = "question_count", nullable = false)
  @Builder.Default
  private Integer questionCount = 0;

  @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private List<QuizSectionRule> rules = new ArrayList<>();

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;
}
