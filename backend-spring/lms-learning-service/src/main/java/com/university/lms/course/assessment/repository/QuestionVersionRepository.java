package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.QuestionVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repository for immutable question versions. */
@Repository
public interface QuestionVersionRepository extends JpaRepository<QuestionVersion, UUID> {

  List<QuestionVersion> findByQuestionIdOrderByVersionNumberDesc(UUID questionId);

  Optional<QuestionVersion> findFirstByQuestionIdOrderByVersionNumberDesc(UUID questionId);

  @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM QuestionVersion v WHERE v.question.id = :questionId")
  int findMaxVersionNumber(@Param("questionId") UUID questionId);
}
