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
@Table(schema = "learning", name = "course_members",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_course_user",
          columnNames = {"course_id", "user_id"})
    },
    indexes = {
      @Index(name = "idx_member_course_user", columnList = "course_id, user_id"),
      @Index(name = "idx_member_role", columnList = "role_in_course"),
      @Index(name = "idx_member_status", columnList = "status")
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

  @Enumerated(EnumType.STRING)
  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
  @Column(name = "role_in_course", nullable = false, columnDefinition = "learning.course_role")
  private CourseRole roleInCourse;

  @Column(name = "added_by")
  private UUID addedBy;

  @CreationTimestamp
  @Column(name = "added_at", nullable = false, updatable = false)
  private LocalDateTime addedAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Enumerated(EnumType.STRING)
  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
  @Column(nullable = false, columnDefinition = "learning.course_member_status")
  @Builder.Default
  private CourseMemberStatus status = CourseMemberStatus.ACTIVE;

  @Column(name = "completion_date")
  private LocalDateTime completionDate;

  // Grade tracking
  @Column(name = "final_grade", precision = 5, scale = 2)
  private BigDecimal finalGrade;

  // Helper methods
  public boolean isOwner() {
    return roleInCourse == CourseRole.OWNER;
  }

  public boolean isTeacher() {
    return roleInCourse == CourseRole.TEACHER || roleInCourse == CourseRole.OWNER;
  }

  public boolean isTA() {
    return roleInCourse == CourseRole.TA;
  }

  public boolean isStudent() {
    return roleInCourse == CourseRole.STUDENT;
  }

  public boolean isActive() {
    return status == CourseMemberStatus.ACTIVE;
  }

  public boolean canManageCourse() {
    return isOwner() || isTeacher() || isTA();
  }
}
