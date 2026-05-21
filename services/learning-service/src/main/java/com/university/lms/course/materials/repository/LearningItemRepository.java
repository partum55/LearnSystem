package com.university.lms.course.materials.repository;

import com.university.lms.course.materials.entity.LearningItem;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LearningItemRepository extends JpaRepository<LearningItem, UUID> {
  List<LearningItem> findByModuleIdOrderByPositionAsc(UUID moduleId);

  @Query("SELECT COALESCE(MAX(i.position), 0) FROM LearningItem i WHERE i.module.id = :moduleId")
  Integer findMaxPositionByModule(@Param("moduleId") UUID moduleId);
}
