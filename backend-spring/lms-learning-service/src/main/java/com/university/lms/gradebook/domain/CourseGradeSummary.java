package com.university.lms.gradebook.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "course_grade_summaries",
        uniqueConstraints = @UniqueConstraint(name = "uk_course_grade_summary_course_student",
                columnNames = {"course_id", "student_id"}),
        indexes = {
                @Index(name = "idx_grade_summary_course_student", columnList = "course_id, student_id"),
                @Index(name = "idx_grade_summary_current_grade", columnList = "current_grade")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseGradeSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "total_points_earned", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalPointsEarned;

    @Column(name = "total_points_possible", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalPointsPossible;

    @Column(name = "current_grade", precision = 5, scale = 2)
    private BigDecimal currentGrade;

    @Column(name = "letter_grade", length = 5)
    private String letterGrade;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "category_grades", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> categoryGrades;

    @Column(name = "assignments_completed", nullable = false)
    private Integer assignmentsCompleted;

    @Column(name = "assignments_total", nullable = false)
    private Integer assignmentsTotal;

    @Column(name = "final_grade", precision = 5, scale = 2)
    private BigDecimal finalGrade;

    @Column(name = "is_final", nullable = false)
    private boolean finalized;

    @UpdateTimestamp
    @Column(name = "last_calculated", nullable = false)
    private LocalDateTime lastCalculated;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

