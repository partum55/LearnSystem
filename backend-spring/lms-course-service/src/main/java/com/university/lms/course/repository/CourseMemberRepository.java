package com.university.lms.course.repository;

import com.university.lms.course.domain.CourseMember;
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
 * Repository for CourseMember entity.
 */
@Repository
public interface CourseMemberRepository extends JpaRepository<CourseMember, UUID> {

    /**
     * Find member by course and user.
     */
    Optional<CourseMember> findByCourseIdAndUserId(UUID courseId, UUID userId);

    /**
     * Check if user is member of course.
     */
    boolean existsByCourseIdAndUserId(UUID courseId, UUID userId);

    /**
     * Find all members of a course.
     */
    Page<CourseMember> findByCourseId(UUID courseId, Pageable pageable);

    /**
     * Find members by course and role.
     */
    List<CourseMember> findByCourseIdAndRoleInCourse(UUID courseId, String role);

    /**
     * Find all courses for a user.
     */
    Page<CourseMember> findByUserId(UUID userId, Pageable pageable);

    /**
     * Find active enrollments for user.
     */
    @Query("SELECT m FROM CourseMember m WHERE m.userId = :userId AND m.enrollmentStatus = 'active'")
    Page<CourseMember> findActiveEnrollmentsForUser(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Count students in course.
     */
    @Query("SELECT COUNT(m) FROM CourseMember m WHERE m.course.id = :courseId " +
           "AND m.roleInCourse = 'STUDENT' AND m.enrollmentStatus = 'active'")
    long countActiveStudents(@Param("courseId") UUID courseId);

    /**
     * Find teachers of a course.
     */
    @Query("SELECT m FROM CourseMember m WHERE m.course.id = :courseId " +
           "AND m.roleInCourse IN ('TEACHER', 'TA')")
    List<CourseMember> findCourseInstructors(@Param("courseId") UUID courseId);

    /**
     * Check if user can manage course.
     */
    @Query("SELECT COUNT(m) > 0 FROM CourseMember m WHERE m.course.id = :courseId " +
           "AND m.userId = :userId AND m.roleInCourse IN ('TEACHER', 'TA')")
    boolean canUserManageCourse(@Param("courseId") UUID courseId, @Param("userId") UUID userId);

    /**
     * Find all enrollments by status.
     */
    Page<CourseMember> findByCourseIdAndEnrollmentStatus(UUID courseId, String status, Pageable pageable);

    /**
     * Delete member by course and user.
     */
    void deleteByCourseIdAndUserId(UUID courseId, UUID userId);

    @Query("SELECT m.userId FROM CourseMember m WHERE m.course.id = :courseId AND m.roleInCourse = 'STUDENT'")
    java.util.List<Long> findStudentIdsByCourseId(@Param("courseId") UUID courseId);
}
