package com.university.lms.gradebook.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "grade_histories", indexes = {
        @Index(name = "idx_grade_history_entry", columnList = "gradebook_entry_id"),
        @Index(name = "idx_grade_history_changed_at", columnList = "changed_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "gradebook_entry_id", nullable = false)
    private GradebookEntry gradebookEntry;

    @Column(name = "old_score", precision = 6, scale = 2)
    private BigDecimal oldScore;

    @Column(name = "new_score", precision = 6, scale = 2)
    private BigDecimal newScore;

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "change_reason", columnDefinition = "TEXT")
    private String changeReason;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;
}

