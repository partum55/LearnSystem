package com.university.lms.course.repository;

import com.university.lms.course.domain.CourseMember;
import com.university.lms.course.domain.CourseMemberStatus;
import com.university.lms.course.domain.CourseRole;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repository for CourseMember entity. */
@Repository
public interface CourseMemberRepository extends JpaRepository<CourseMember, UUID> {

  /** Find member by course and user. */
  Optional<CourseMember> findByCourseIdAndUserId(UUID courseId, UUID userId);

  /** Check if user is member of course. */
  boolean existsByCourseIdAndUserId(UUID courseId, UUID userId);

  /** Find all members of a course. */
  Page<CourseMember> findByCourseId(UUID courseId, Pageable pageable);

  /** Find members by course and role. */
  List<CourseMember> findByCourseIdAndRoleInCourse(UUID courseId, CourseRole role);

  /** Find members by course and role with pagination. */
  Page<CourseMember> findByCourseIdAndRoleInCourse(UUID courseId, CourseRole role, Pageable pageable);

  /** Find all courses for a user. */
  Page<CourseMember> findByUserId(UUID userId, Pageable pageable);

  /** Find active enrollments for user. */
  @Query("SELECT m FROM CourseMember m WHERE m.userId = :userId AND m.status = com.university.lms.course.domain.CourseMemberStatus.ACTIVE")
  Page<CourseMember> findActiveEnrollmentsForUser(@Param("userId") UUID userId, Pageable pageable);

  /** Count students in course. */
  @Query(
      "SELECT COUNT(m) FROM CourseMember m WHERE m.course.id = :courseId "
          + "AND m.roleInCourse = com.university.lms.course.domain.CourseRole.STUDENT "
          + "AND m.status = com.university.lms.course.domain.CourseMemberStatus.ACTIVE")
  long countActiveStudents(@Param("courseId") UUID courseId);

  /** Count all members in a course. */
  long countByCourseId(UUID courseId);

  /** Batch load enrollments by course IDs and user IDs. */
  @Query("SELECT m FROM CourseMember m WHERE m.course.id IN :courseIds AND m.userId IN :userIds")
  List<CourseMember> findByCourseIdInAndUserIdIn(
      @Param("courseIds") Collection<UUID> courseIds, @Param("userIds") Collection<UUID> userIds);

  /** Find teachers of a course. */
  @Query(
      "SELECT m FROM CourseMember m WHERE m.course.id = :courseId "
          + "AND m.roleInCourse IN (com.university.lms.course.domain.CourseRole.TEACHER, com.university.lms.course.domain.CourseRole.TA, com.university.lms.course.domain.CourseRole.OWNER) AND m.status = com.university.lms.course.domain.CourseMemberStatus.ACTIVE")
  List<CourseMember> findCourseInstructors(@Param("courseId") UUID courseId);

  /** Check if user can manage course. */
  @Query(
      "SELECT COUNT(m) > 0 FROM CourseMember m WHERE m.course.id = :courseId "
          + "AND m.userId = :userId AND m.roleInCourse IN (com.university.lms.course.domain.CourseRole.TEACHER, com.university.lms.course.domain.CourseRole.TA, com.university.lms.course.domain.CourseRole.OWNER) "
          + "AND m.status = com.university.lms.course.domain.CourseMemberStatus.ACTIVE")
  boolean canUserManageCourse(@Param("courseId") UUID courseId, @Param("userId") UUID userId);

  /** Find all enrollments by status. */
  Page<CourseMember> findByCourseIdAndStatus(
      UUID courseId, CourseMemberStatus status, Pageable pageable);

  /** Delete member by course and user. */
  void deleteByCourseIdAndUserId(UUID courseId, UUID userId);

  /** Delete all memberships for a specific user. */
  long deleteByUserId(UUID userId);

  @Query(
      "SELECT m.userId FROM CourseMember m WHERE m.course.id = :courseId AND m.roleInCourse = com.university.lms.course.domain.CourseRole.STUDENT")
  List<UUID> findStudentIdsByCourseId(@Param("courseId") UUID courseId);

  @Query(
      "SELECT DISTINCT m.course.id FROM CourseMember m WHERE m.userId = :userId "
          + "AND m.roleInCourse IN (com.university.lms.course.domain.CourseRole.TEACHER, com.university.lms.course.domain.CourseRole.TA, com.university.lms.course.domain.CourseRole.OWNER) "
          + "AND m.status = com.university.lms.course.domain.CourseMemberStatus.ACTIVE")
  List<UUID> findManagedCourseIdsByUserId(@Param("userId") UUID userId);

  @Query(
      "SELECT m.userId FROM CourseMember m WHERE m.course.id = :courseId "
          + "AND m.roleInCourse = com.university.lms.course.domain.CourseRole.STUDENT "
          + "AND m.status = com.university.lms.course.domain.CourseMemberStatus.ACTIVE")
  List<UUID> findActiveStudentUserIdsByCourseId(@Param("courseId") UUID courseId);

  @Query(
      "SELECT DISTINCT m.course.id FROM CourseMember m WHERE m.userId = :userId "
          + "AND m.status = com.university.lms.course.domain.CourseMemberStatus.ACTIVE")
  List<UUID> findActiveCourseIdsByUserId(@Param("userId") UUID userId);
}
