package com.university.lms.ai.repository;

import com.university.lms.ai.domain.CourseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for CourseTemplate
 */
@Repository
public interface CourseTemplateRepository extends JpaRepository<CourseTemplate, UUID> {

    List<CourseTemplate> findByCategory(String category);

    List<CourseTemplate> findByIsPublicTrueAndIsActiveTrue();

    List<CourseTemplate> findByCategoryAndIsPublicTrueAndIsActiveTrue(String category);

    @Query("SELECT t FROM CourseTemplate t WHERE t.isPublic = true AND t.isActive = true ORDER BY t.usageCount DESC")
    List<CourseTemplate> findPopularTemplates();

    @Query("SELECT t FROM CourseTemplate t WHERE t.isPublic = true AND t.isActive = true ORDER BY t.averageRating DESC")
    List<CourseTemplate> findTopRatedTemplates();
}

