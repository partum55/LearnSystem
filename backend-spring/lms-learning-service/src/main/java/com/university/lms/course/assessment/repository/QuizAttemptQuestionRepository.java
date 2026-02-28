package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.QuizAttemptQuestion;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for frozen attempt question snapshots. */
@Repository
public interface QuizAttemptQuestionRepository extends JpaRepository<QuizAttemptQuestion, UUID> {

  List<QuizAttemptQuestion> findByAttempt_IdOrderByPositionAsc(UUID attemptId);

  void deleteByAttempt_Id(UUID attemptId);
}
