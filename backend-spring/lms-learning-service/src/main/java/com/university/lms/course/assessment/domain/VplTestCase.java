package com.university.lms.course.assessment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vpl_test_cases", indexes = {
    @Index(name = "idx_vpl_test_cases_assignment", columnList = "assignment_id, position")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VplTestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String input;

    @Column(name = "expected_output", columnDefinition = "TEXT")
    private String expectedOutput;

    @Column(name = "check_mode", length = 20, nullable = false)
    @Builder.Default
    private String checkMode = "TRIM";

    @Column(name = "test_code", columnDefinition = "TEXT")
    private String testCode;

    @Column(nullable = false)
    @Builder.Default
    private Boolean hidden = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean required = false;

    @Column(nullable = false)
    @Builder.Default
    private Integer weight = 1;

    @Column(nullable = false)
    @Builder.Default
    private Integer position = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
