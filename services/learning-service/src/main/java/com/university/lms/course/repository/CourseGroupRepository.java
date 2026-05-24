package com.university.lms.course.repository;

import com.university.lms.course.domain.CourseGroup;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseGroupRepository extends JpaRepository<CourseGroup, UUID> {
  List<CourseGroup> findByCourseId(UUID courseId);
  boolean existsByCourseIdAndGroupId(UUID courseId, UUID groupId);
  void deleteByCourseIdAndGroupId(UUID courseId, UUID groupId);
}
