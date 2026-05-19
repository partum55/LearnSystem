package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.Quiz;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for Quiz entity.
 */
@Repository
public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    /**
     * Find quizzes by course.
     */
    Page<Quiz> findByCourseId(UUID courseId, Pageable pageable);

    /**
     * Find quizzes by course ordered by creation date.
     */
    List<Quiz> findByCourseIdOrderByCreatedAtDesc(UUID courseId);

    /**
     * Find quizzes created by user.
     */
    Page<Quiz> findByCreatedBy(UUID createdBy, Pageable pageable);

    /**
     * Count quizzes by course.
     */
    long countByCourseId(UUID courseId);
}

