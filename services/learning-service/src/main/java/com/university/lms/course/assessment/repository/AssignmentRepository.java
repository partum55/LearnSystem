package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.Assignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Assignment entity.
 */
@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {

    /**
     * Find assignments by course.
     */
    Page<Assignment> findByCourseId(UUID courseId, Pageable pageable);

    /**
     * Find assignments by course ordered by due date.
     */
    List<Assignment> findByCourseIdOrderByDueDateAsc(UUID courseId);

    /**
     * Find assignments by module.
     */
    List<Assignment> findByModuleIdOrderByPositionAsc(UUID moduleId);

    /**
     * Find published assignments by course.
     */
    @Query("SELECT a FROM Assignment a WHERE a.courseId = :courseId AND a.isPublished = true " +
            "AND a.isArchived = false ORDER BY a.dueDate ASC")
    List<Assignment> findPublishedByCourse(@Param("courseId") UUID courseId);

    /**
     * Find assignments by type.
     */
    Page<Assignment> findByCourseIdAndAssignmentType(UUID courseId, String assignmentType, Pageable pageable);

    /**
     * Find upcoming assignments (due in the future).
     */
    @Query("SELECT a FROM Assignment a WHERE a.courseId = :courseId AND a.isPublished = true " +
            "AND a.dueDate > :now ORDER BY a.dueDate ASC")
    List<Assignment> findUpcomingAssignments(@Param("courseId") UUID courseId, @Param("now") LocalDateTime now);

    /**
     * Find overdue assignments.
     */
    @Query("SELECT a FROM Assignment a WHERE a.courseId = :courseId AND a.isPublished = true " +
            "AND a.dueDate < :now AND a.dueDate IS NOT NULL ORDER BY a.dueDate DESC")
    List<Assignment> findOverdueAssignments(@Param("courseId") UUID courseId, @Param("now") LocalDateTime now);

    /**
     * Find available assignments (published and within available dates).
     */
    @Query("SELECT a FROM Assignment a WHERE a.courseId = :courseId AND a.isPublished = true " +
            "AND a.isArchived = false " +
            "AND (a.availableFrom IS NULL OR a.availableFrom <= :now) " +
            "AND (a.availableUntil IS NULL OR a.availableUntil >= :now)")
    List<Assignment> findAvailableAssignments(@Param("courseId") UUID courseId, @Param("now") LocalDateTime now);

    /**
     * Find assignments by category.
     */
    List<Assignment> findByCategoryIdOrderByDueDateAsc(UUID categoryId);

    /**
     * Count assignments by course.
     */
    long countByCourseId(UUID courseId);

    /**
     * Count published assignments by course.
     */
    long countByCourseIdAndIsPublishedTrue(UUID courseId);

    /**
     * Find templates.
     */
    Page<Assignment> findByIsTemplateTrue(Pageable pageable);

    /**
     * Search assignments by title or description.
     */
    @Query("SELECT a FROM Assignment a WHERE a.courseId = :courseId " +
            "AND (LOWER(a.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(a.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Assignment> searchAssignments(@Param("courseId") UUID courseId,
                                       @Param("searchTerm") String searchTerm,
                                       Pageable pageable);

    List<Assignment> findByCourseId(UUID courseId);

    List<Assignment> findByCourseIdIn(List<UUID> courseIds);

    Optional<Assignment> findFirstByQuizId(UUID quizId);
}
