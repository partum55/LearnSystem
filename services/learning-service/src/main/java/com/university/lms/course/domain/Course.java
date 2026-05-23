package com.university.lms.course.domain;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * Course entity with multilingual support and comprehensive tracking. Migrated from Django Course
 * model with all features preserved.
 */
@Entity
@Table(schema = "learning", name = "courses",
    indexes = {
      @Index(name = "idx_course_code", columnList = "code"),
      @Index(name = "idx_course_owner", columnList = "owner_id"),
      @Index(name = "idx_course_status", columnList = "status")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true, length = 50)
  private String code;

  // Multilingual fields
  @Column(name = "title_uk", nullable = false, length = 255)
  private String titleUk;

  @Column(name = "title_en", length = 255)
  private String titleEn;

  @Column(name = "description_uk", columnDefinition = "TEXT")
  private String descriptionUk;

  @Column(name = "description_en", columnDefinition = "TEXT")
  private String descriptionEn;

  @Column(columnDefinition = "TEXT")
  private String syllabus;

  // Owner relationship - stored as UUID to avoid tight coupling
  @Column(name = "owner_id", nullable = false)
  private UUID ownerId;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.NAMED_ENUM)
  @Column(nullable = false, columnDefinition = "learning.course_visibility")
  @Builder.Default
  private CourseVisibility visibility = CourseVisibility.DRAFT;

  @Column(length = 500)
  private String thumbnailUrl;

  @Column(name = "theme_color", length = 20)
  private String themeColor;

  // Date tracking
  @Column(name = "start_date")
  private LocalDate startDate;

  @Column(name = "end_date")
  private LocalDate endDate;

  // Academic tracking
  @Column(name = "academic_year", length = 20)
  private String academicYear;

  @Column(name = "department_id")
  private UUID departmentId;

  @Column(name = "max_students")
  private Integer maxStudents;

  // Course status
  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.NAMED_ENUM)
  @Column(nullable = false, columnDefinition = "learning.course_status")
  @Builder.Default
  private CourseStatus status = CourseStatus.DRAFT;

  @Column(name = "qr_attendance_enabled", nullable = false)
  @Builder.Default
  private Boolean qrAttendanceEnabled = false;

  // Audit fields
  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  // Relationships
  @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private Set<CourseMember> members = new HashSet<>();

  @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("position ASC")
  @Builder.Default
  private Set<Module> modules = new HashSet<>();

  // Helper methods
  public String getTitle(String language) {
    return "uk".equalsIgnoreCase(language) ? titleUk : (titleEn != null ? titleEn : titleUk);
  }

  public String getDescription(String language) {
    return "uk".equalsIgnoreCase(language)
        ? descriptionUk
        : (descriptionEn != null ? descriptionEn : descriptionUk);
  }

  public int getCurrentEnrollment() {
    return (int)
        members.stream()
            .filter(m -> m.getRoleInCourse() == CourseRole.STUDENT && m.isActive())
            .count();
  }

  public boolean hasCapacity() {
    return maxStudents == null || getCurrentEnrollment() < maxStudents;
  }

  public boolean isActive() {
    return status == CourseStatus.PUBLISHED;
  }
}
