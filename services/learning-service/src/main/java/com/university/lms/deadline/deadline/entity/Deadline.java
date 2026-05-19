package com.university.lms.deadline.deadline.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "deadlines")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deadline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "student_group_id", nullable = false)
    private Long studentGroupId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "due_at", nullable = false)
    private OffsetDateTime dueAt;

    @Column(name = "estimated_effort", nullable = false)
    private Integer estimatedEffort;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DeadlineType type;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}

