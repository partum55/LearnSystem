package com.university.lms.deadline.workload.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "workload_snapshots", uniqueConstraints = {
        @UniqueConstraint(name = "uk_workload_student_date", columnNames = {"student_id", "date"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkloadSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "total_effort", nullable = false)
    private Integer totalEffort;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;

    @PrePersist
    void onCreate() {
        if (generatedAt == null) {
            generatedAt = OffsetDateTime.now();
        }
    }
}

