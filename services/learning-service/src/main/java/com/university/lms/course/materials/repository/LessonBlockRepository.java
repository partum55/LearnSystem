package com.university.lms.course.materials.repository;

import com.university.lms.course.materials.entity.LessonBlock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LessonBlockRepository extends JpaRepository<LessonBlock, UUID> {
  List<LessonBlock> findByLearningItemIdOrderByPositionAsc(UUID learningItemId);

  Optional<LessonBlock> findByIdAndLearningItemId(UUID id, UUID learningItemId);

  @Query("SELECT COALESCE(MAX(b.position), 0) FROM LessonBlock b WHERE b.learningItem.id = :learningItemId")
  Integer findMaxPositionByLearningItem(@Param("learningItemId") UUID learningItemId);
}
