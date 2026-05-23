package com.university.lms.course.materials.repository;

import com.university.lms.course.materials.entity.LessonPage;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LessonPageRepository extends JpaRepository<LessonPage, UUID> {
  List<LessonPage> findByLearningItemIdOrderByPositionAsc(UUID learningItemId);

  Optional<LessonPage> findByIdAndLearningItemId(UUID id, UUID learningItemId);

  @Query("SELECT COALESCE(MAX(p.position), 0) FROM LessonPage p WHERE p.learningItem.id = :learningItemId")
  Integer findMaxPositionByLearningItem(@Param("learningItemId") UUID learningItemId);
}
