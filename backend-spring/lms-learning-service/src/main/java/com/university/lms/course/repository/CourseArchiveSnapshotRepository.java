package com.university.lms.course.repository;

import com.university.lms.course.domain.CourseArchiveSnapshot;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repository for immutable archived course snapshots. */
@Repository
public interface CourseArchiveSnapshotRepository extends JpaRepository<CourseArchiveSnapshot, UUID> {

  Optional<CourseArchiveSnapshot> findTopByCourseIdOrderByVersionDesc(UUID courseId);

  @Query(
      "SELECT COALESCE(MAX(s.version), 0) FROM CourseArchiveSnapshot s WHERE s.courseId = :courseId")
  int findMaxVersionByCourseId(@Param("courseId") UUID courseId);
}
