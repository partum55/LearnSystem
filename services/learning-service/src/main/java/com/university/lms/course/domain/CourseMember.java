package com.university.lms.course.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Course membership entity linking users to courses. Tracks enrollment, role, and grade
 * information.
 */
@Entity
@Table(
    name = "course_members",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_course_user",
          columnNames = {"course_id", "user_id"})
    },
    indexes = {
      @Index(name = "idx_member_course_user", columnList = "course_id, user_id"),
      @Index(name = "idx_member_role", columnList = "role_in_course"),
      @Index(name = "idx_member_status", columnList = "enrollment_status")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseMember {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "role_in_course", nullable = false, length = 20)
  private String roleInCourse; // TEACHER, TA, STUDENT

  @Column(name = "added_by")
  private UUID addedBy;

  @CreationTimestamp
  @Column(name = "added_at", nullable = false, updatable = false)
  private LocalDateTime addedAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  // Enrollment tracking
  @Column(name = "enrollment_status", nullable = false, length = 20)
  @Builder.Default
  private String enrollmentStatus = "active"; // active, dropped, completed

  @Column(name = "completion_date")
  private LocalDateTime completionDate;

  // Grade tracking
  @Column(name = "final_grade", precision = 5, scale = 2)
  private BigDecimal finalGrade;

  // Helper methods
  public boolean isTeacher() {
    return "TEACHER".equals(roleInCourse);
  }

  public boolean isTA() {
    return "TA".equals(roleInCourse);
  }

  public boolean isStudent() {
    return "STUDENT".equals(roleInCourse);
  }

  public boolean isActive() {
    return "active".equals(enrollmentStatus);
  }

  public boolean canManageCourse() {
    return isTeacher() || isTA();
  }
}
