package com.university.lms.course.repository;

import com.university.lms.course.domain.Topic;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repository for Topic entity. */
@Repository
public interface TopicRepository extends JpaRepository<Topic, UUID> {

  /** Find all topics for a module ordered by position. */
  List<Topic> findByModuleIdOrderByPositionAsc(UUID moduleId);

  /** Get max position in module. */
  @Query("SELECT COALESCE(MAX(t.position), -1) FROM Topic t WHERE t.module.id = :moduleId")
  Integer findMaxPositionByModule(@Param("moduleId") UUID moduleId);
}
