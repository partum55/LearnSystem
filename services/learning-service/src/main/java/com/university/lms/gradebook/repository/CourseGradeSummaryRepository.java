package com.university.lms.gradebook.repository;

import com.university.lms.gradebook.domain.CourseGradeSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CourseGradeSummaryRepository extends JpaRepository<CourseGradeSummary, UUID> {
    Optional<CourseGradeSummary> findByCourseIdAndStudentId(UUID courseId, UUID studentId);
}

