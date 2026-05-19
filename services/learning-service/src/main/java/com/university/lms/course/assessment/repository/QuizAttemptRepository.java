package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.QuizAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for QuizAttempt entity.
 */
@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    /**
     * Find attempts by quiz.
     */
    Page<QuizAttempt> findByQuizId(UUID quizId, Pageable pageable);

    /**
     * Find attempts by user.
     */
    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(UUID userId);

    /**
     * Find attempts by quiz and user.
     */
    List<QuizAttempt> findByQuizIdAndUserIdOrderByAttemptNumberAsc(UUID quizId, UUID userId);

    /**
     * Find specific attempt.
     */
    Optional<QuizAttempt> findByQuizIdAndUserIdAndAttemptNumber(UUID quizId, UUID userId, Integer attemptNumber);

    /**
     * Find latest attempt for user.
     */
    Optional<QuizAttempt> findFirstByQuizIdAndUserIdOrderByAttemptNumberDesc(UUID quizId, UUID userId);

    /**
     * Find in-progress attempts.
     */
    @Query("SELECT qa FROM QuizAttempt qa WHERE qa.quiz.id = :quizId AND qa.userId = :userId " +
           "AND qa.submittedAt IS NULL")
    Optional<QuizAttempt> findInProgressAttempt(@Param("quizId") UUID quizId, @Param("userId") UUID userId);

    /**
     * Find submitted attempts.
     */
    @Query("SELECT qa FROM QuizAttempt qa WHERE qa.quiz.id = :quizId AND qa.submittedAt IS NOT NULL")
    Page<QuizAttempt> findSubmittedAttempts(@Param("quizId") UUID quizId, Pageable pageable);

    /**
     * Find ungraded attempts.
     */
    @Query("SELECT qa FROM QuizAttempt qa WHERE qa.quiz.id = :quizId " +
           "AND qa.submittedAt IS NOT NULL AND qa.finalScore IS NULL")
    List<QuizAttempt> findUngradedAttempts(@Param("quizId") UUID quizId);

    /**
     * Count attempts by quiz.
     */
    long countByQuizId(UUID quizId);

    /**
     * Count attempts by quiz and user.
     */
    long countByQuizIdAndUserId(UUID quizId, UUID userId);

    /**
     * Count submitted attempts.
     */
    @Query("SELECT COUNT(qa) FROM QuizAttempt qa WHERE qa.quiz.id = :quizId AND qa.submittedAt IS NOT NULL")
    long countSubmittedAttempts(@Param("quizId") UUID quizId);
}
