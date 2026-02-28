package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.QuestionBank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for QuestionBank entity.
 */
@Repository
public interface QuestionBankRepository extends JpaRepository<QuestionBank, UUID> {

    /**
     * Find questions by course.
     */
    Page<QuestionBank> findByCourseId(UUID courseId, Pageable pageable);

    /**
     * Find questions by question type.
     */
    Page<QuestionBank> findByCourseIdAndQuestionType(UUID courseId, String questionType, Pageable pageable);

    /**
     * Find global questions (not tied to a course).
     */
    Page<QuestionBank> findByCourseIdIsNull(Pageable pageable);

    /**
     * Find questions created by user.
     */
    Page<QuestionBank> findByCreatedBy(UUID createdBy, Pageable pageable);

    /**
     * Search questions by stem.
     */
    @Query("SELECT q FROM QuestionBank q WHERE " +
           "(q.courseId = :courseId OR q.courseId IS NULL) " +
           "AND LOWER(q.stem) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<QuestionBank> searchQuestions(@Param("courseId") UUID courseId,
                                       @Param("searchTerm") String searchTerm,
                                       Pageable pageable);

    /**
     * Find questions by difficulty (from metadata).
     */
    @Query(value = "SELECT * FROM question_bank WHERE course_id = :courseId " +
           "AND (difficulty = :difficulty OR metadata->>'difficulty' = :difficulty)", nativeQuery = true)
    List<QuestionBank> findByDifficulty(@Param("courseId") UUID courseId, @Param("difficulty") String difficulty);

    /**
     * Count questions by course.
     */
    long countByCourseId(UUID courseId);

    /**
     * Count questions by type.
     */
    long countByCourseIdAndQuestionType(UUID courseId, String questionType);

    /**
     * Get active course questions for quiz-section selection.
     */
    @Query("SELECT q FROM QuestionBank q WHERE q.courseId = :courseId AND q.isArchived = false")
    List<QuestionBank> findActiveByCourseId(@Param("courseId") UUID courseId);
}
