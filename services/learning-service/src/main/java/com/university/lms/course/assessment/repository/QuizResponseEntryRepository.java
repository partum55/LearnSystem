package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.QuizResponseEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for per-question quiz responses. */
@Repository
public interface QuizResponseEntryRepository extends JpaRepository<QuizResponseEntry, UUID> {

  List<QuizResponseEntry> findByAttempt_Id(UUID attemptId);

  Optional<QuizResponseEntry> findByAttemptQuestion_Id(UUID attemptQuestionId);
}
