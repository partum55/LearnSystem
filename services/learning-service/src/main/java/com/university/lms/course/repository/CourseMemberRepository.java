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

  /** Find members in a course by their user IDs. */
  List<CourseMember> findByCourseIdAndUserIdIn(UUID courseId, Collection<UUID> userIds);

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
  Page<CourseMember> findByUserIdAndStatus(UUID userId, CourseMemberStatus status, Pageable pageable);

  default Page<CourseMember> findActiveEnrollmentsForUser(UUID userId, Pageable pageable) {
    return findByUserIdAndStatus(userId, CourseMemberStatus.ACTIVE, pageable);
  }

  /** Count students in course. */
  long countByCourseIdAndRoleInCourseAndStatus(UUID courseId, CourseRole role, CourseMemberStatus status);

  default long countActiveStudents(UUID courseId) {
    return countByCourseIdAndRoleInCourseAndStatus(courseId, CourseRole.STUDENT, CourseMemberStatus.ACTIVE);
  }

  /** Count all members in a course. */
  long countByCourseId(UUID courseId);

  /** Batch load enrollments by course IDs and user IDs. */
  @Query("SELECT m FROM CourseMember m WHERE m.course.id IN :courseIds AND m.userId IN :userIds")
  List<CourseMember> findByCourseIdInAndUserIdIn(
      @Param("courseIds") Collection<UUID> courseIds, @Param("userIds") Collection<UUID> userIds);

  /** Find teachers of a course. */
  List<CourseMember> findByCourseIdAndRoleInCourseInAndStatus(UUID courseId, Collection<CourseRole> roles, CourseMemberStatus status);

  default List<CourseMember> findCourseInstructors(UUID courseId) {
    return findByCourseIdAndRoleInCourseInAndStatus(
        courseId,
        List.of(CourseRole.TEACHER, CourseRole.TA, CourseRole.OWNER),
        CourseMemberStatus.ACTIVE
    );
  }

  /** Check if user can manage course. */
  boolean existsByCourseIdAndUserIdAndRoleInCourseInAndStatus(UUID courseId, UUID userId, Collection<CourseRole> roles, CourseMemberStatus status);

  default boolean canUserManageCourse(UUID courseId, UUID userId) {
    return existsByCourseIdAndUserIdAndRoleInCourseInAndStatus(
        courseId,
        userId,
        List.of(CourseRole.TEACHER, CourseRole.TA, CourseRole.OWNER),
        CourseMemberStatus.ACTIVE
    );
  }

  /** Find all enrollments by status. */
  Page<CourseMember> findByCourseIdAndStatus(
      UUID courseId, CourseMemberStatus status, Pageable pageable);

  /** Delete member by course and user. */
  void deleteByCourseIdAndUserId(UUID courseId, UUID userId);

  /** Delete all memberships for a specific user. */
  long deleteByUserId(UUID userId);

  @Query("SELECT m.userId FROM CourseMember m WHERE m.course.id = :courseId AND m.roleInCourse = :role")
  List<UUID> findUserIdsByCourseIdAndRole(@Param("courseId") UUID courseId, @Param("role") CourseRole role);

  default List<UUID> findStudentIdsByCourseId(UUID courseId) {
    return findUserIdsByCourseIdAndRole(courseId, CourseRole.STUDENT);
  }

  @Query("SELECT DISTINCT m.course.id FROM CourseMember m WHERE m.userId = :userId AND m.roleInCourse IN :roles AND m.status = :status")
  List<UUID> findCourseIdsByUserIdAndRolesAndStatus(
      @Param("userId") UUID userId,
      @Param("roles") Collection<CourseRole> roles,
      @Param("status") CourseMemberStatus status);

  default List<UUID> findManagedCourseIdsByUserId(UUID userId) {
    return findCourseIdsByUserIdAndRolesAndStatus(
        userId,
        List.of(CourseRole.TEACHER, CourseRole.TA, CourseRole.OWNER),
        CourseMemberStatus.ACTIVE
    );
  }

  @Query("SELECT m.userId FROM CourseMember m WHERE m.course.id = :courseId AND m.roleInCourse = :role AND m.status = :status")
  List<UUID> findUserIdsByCourseIdAndRoleAndStatus(
      @Param("courseId") UUID courseId,
      @Param("role") CourseRole role,
      @Param("status") CourseMemberStatus status);

  default List<UUID> findActiveStudentUserIdsByCourseId(UUID courseId) {
    return findUserIdsByCourseIdAndRoleAndStatus(courseId, CourseRole.STUDENT, CourseMemberStatus.ACTIVE);
  }

  @Query("SELECT DISTINCT m.course.id FROM CourseMember m WHERE m.userId = :userId AND m.status = :status")
  List<UUID> findCourseIdsByUserIdAndStatus(
      @Param("userId") UUID userId,
      @Param("status") CourseMemberStatus status);

  default List<UUID> findActiveCourseIdsByUserId(UUID userId) {
    return findCourseIdsByUserIdAndStatus(userId, CourseMemberStatus.ACTIVE);
  }
}
