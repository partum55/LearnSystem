package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.QuizSection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for quiz sections. */
@Repository
public interface QuizSectionRepository extends JpaRepository<QuizSection, UUID> {

  List<QuizSection> findByQuizIdOrderByPositionAsc(UUID quizId);

  void deleteByQuizId(UUID quizId);
}
