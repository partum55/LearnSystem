package com.university.lms.course.repository;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.common.domain.CourseVisibility;
import com.university.lms.course.domain.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Course entity with advanced query capabilities.
 */
@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {

    /**
     * Find course by unique code.
     */
    Optional<Course> findByCode(String code);

    /**
     * Check if course with code exists.
     */
    boolean existsByCode(String code);

    /**
     * Find all courses by owner.
     */
    Page<Course> findByOwnerId(UUID ownerId, Pageable pageable);

    /**
     * Find published courses.
     */
    Page<Course> findByIsPublishedTrueAndVisibility(CourseVisibility visibility, Pageable pageable);

    /**
     * Find courses by status.
     */
    Page<Course> findByStatus(CourseStatus status, Pageable pageable);

    /**
     * Find courses by academic year.
     */
    Page<Course> findByAcademicYear(String academicYear, Pageable pageable);

    /**
     * Find courses by department.
     */
    Page<Course> findByDepartmentId(UUID departmentId, Pageable pageable);

    /**
     * Search courses by title (multilingual).
     */
    @Query("SELECT c FROM Course c WHERE " +
           "LOWER(c.titleUk) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.titleEn) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.code) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<Course> searchCourses(@Param("searchTerm") String searchTerm, Pageable pageable);

    /**
     * Find courses that user is enrolled in.
     */
    @Query("SELECT c FROM Course c JOIN c.members m WHERE m.userId = :userId")
    Page<Course> findCoursesForUser(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Find courses where user has specific role.
     */
    @Query("SELECT c FROM Course c JOIN c.members m WHERE m.userId = :userId AND m.roleInCourse = :role")
    Page<Course> findCoursesForUserByRole(
        @Param("userId") UUID userId,
        @Param("role") String role,
        Pageable pageable
    );

    /**
     * Find active courses (published and within date range if specified).
     */
    @Query("SELECT c FROM Course c WHERE c.isPublished = true AND c.status = 'PUBLISHED' " +
           "AND (c.startDate IS NULL OR c.startDate <= CURRENT_DATE) " +
           "AND (c.endDate IS NULL OR c.endDate >= CURRENT_DATE)")
    Page<Course> findActiveCourses(Pageable pageable);

    /**
     * Count courses by owner.
     */
    long countByOwnerId(UUID ownerId);

    /**
     * Count courses by department.
     */
    long countByDepartmentId(UUID departmentId);

    /**
     * Find courses with available capacity.
     */
    @Query("SELECT c FROM Course c WHERE c.isPublished = true " +
           "AND (c.maxStudents IS NULL OR " +
           "(SELECT COUNT(m) FROM CourseMember m WHERE m.course = c AND m.roleInCourse = 'STUDENT' AND m.enrollmentStatus = 'active') < c.maxStudents)")
    Page<Course> findCoursesWithCapacity(Pageable pageable);
}

