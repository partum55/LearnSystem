package com.university.lms.course.repository;

import com.university.lms.course.domain.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for Resource entity.
 */
@Repository
public interface ResourceRepository extends JpaRepository<Resource, UUID> {

    /**
     * Find all resources for a module ordered by position.
     */
    List<Resource> findByModuleIdOrderByPositionAsc(UUID moduleId);

    /**
     * Find resources by type.
     */
    List<Resource> findByModuleIdAndResourceType(UUID moduleId, String resourceType);

    /**
     * Count resources in module.
     */
    long countByModuleId(UUID moduleId);

    /**
     * Get max position in module.
     */
    @Query("SELECT COALESCE(MAX(r.position), 0) FROM Resource r WHERE r.module.id = :moduleId")
    Integer findMaxPositionByModule(@Param("moduleId") UUID moduleId);

    /**
     * Find all resources for a course.
     */
    @Query("SELECT r FROM Resource r WHERE r.module.course.id = :courseId ORDER BY r.module.position, r.position")
    List<Resource> findAllByCourseId(@Param("courseId") UUID courseId);
}

