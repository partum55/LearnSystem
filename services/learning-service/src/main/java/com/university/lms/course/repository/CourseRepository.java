package com.university.lms.course.repository;

import com.university.lms.common.domain.CourseStatus;
import com.university.lms.course.domain.Course;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for Course entity. Exposes only scoped queries used by the canonical access path. */
@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {

  /** Find course by unique code. */
  Optional<Course> findByCode(String code);

  /** Find courses by a collection of codes. */
  List<Course> findByCodeIn(Collection<String> codes);

  /** Check if course with code exists. */
  boolean existsByCode(String code);

  /** Find all courses owned by a user (used for safe archive on account deletion). */
  List<Course> findByOwnerId(UUID ownerId);

  /** Find courses by status. */
  Page<Course> findByStatus(CourseStatus status, Pageable pageable);

  /** Find courses by lifecycle statuses. */
  Page<Course> findByStatusIn(Collection<CourseStatus> statuses, Pageable pageable);
}
