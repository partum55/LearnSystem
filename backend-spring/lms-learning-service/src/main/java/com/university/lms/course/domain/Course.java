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
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Course entity with multilingual support and comprehensive tracking. Migrated from Django Course
 * model with all features preserved.
 */
@Entity
@Table(
    name = "courses",
    indexes = {
      @Index(name = "idx_course_code", columnList = "code"),
      @Index(name = "idx_course_owner", columnList = "owner_id"),
      @Index(name = "idx_course_published", columnList = "is_published"),
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
  @Column(nullable = false, length = 20)
  @Builder.Default
  private CourseVisibility visibility = CourseVisibility.DRAFT;

  @Column(length = 500)
  private String thumbnailUrl;

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
  @Column(nullable = false, length = 20)
  @Builder.Default
  private CourseStatus status = CourseStatus.DRAFT;

  @Column(name = "is_published", nullable = false)
  @Builder.Default
  private Boolean isPublished = false;

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
            .filter(
                m ->
                    "STUDENT".equals(m.getRoleInCourse())
                        && "active".equals(m.getEnrollmentStatus()))
            .count();
  }

  public boolean hasCapacity() {
    return maxStudents == null || getCurrentEnrollment() < maxStudents;
  }

  public boolean isActive() {
    return Boolean.TRUE.equals(isPublished) && status == CourseStatus.PUBLISHED;
  }
}
