package com.university.lms.gradebook.repository;

import com.university.lms.gradebook.domain.GradebookCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GradebookCategoryRepository extends JpaRepository<GradebookCategory, UUID> {
    List<GradebookCategory> findByCourseIdOrderByPosition(UUID courseId);
}

