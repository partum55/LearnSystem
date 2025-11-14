package com.university.lms.course.repository;

import com.university.lms.course.domain.Module;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for Module entity.
 */
@Repository
public interface ModuleRepository extends JpaRepository<Module, UUID> {

    /**
     * Find all modules for a course ordered by position.
     */
    List<Module> findByCourseIdOrderByPositionAsc(UUID courseId);

    /**
     * Find published modules for a course.
     */
    @Query("SELECT m FROM Module m WHERE m.course.id = :courseId AND m.isPublished = true " +
           "AND (m.publishDate IS NULL OR m.publishDate <= CURRENT_TIMESTAMP) " +
           "ORDER BY m.position ASC")
    List<Module> findPublishedModulesByCourse(@Param("courseId") UUID courseId);

    /**
     * Find modules with pagination.
     */
    Page<Module> findByCourseId(UUID courseId, Pageable pageable);

    /**
     * Count modules in course.
     */
    long countByCourseId(UUID courseId);

    /**
     * Get max position in course.
     */
    @Query("SELECT COALESCE(MAX(m.position), 0) FROM Module m WHERE m.course.id = :courseId")
    Integer findMaxPositionByCourse(@Param("courseId") UUID courseId);
}

