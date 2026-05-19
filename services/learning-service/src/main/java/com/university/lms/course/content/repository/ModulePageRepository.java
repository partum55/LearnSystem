package com.university.lms.course.content.repository;

import com.university.lms.course.content.domain.ModulePage;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repository for module page trees. */
@Repository
public interface ModulePageRepository extends JpaRepository<ModulePage, UUID> {

  List<ModulePage> findByModuleIdOrderByParentPageIdAscPositionAsc(UUID moduleId);

  List<ModulePage> findByModuleIdAndIsPublishedTrueOrderByParentPageIdAscPositionAsc(UUID moduleId);

  Optional<ModulePage> findByIdAndModuleId(UUID pageId, UUID moduleId);

  Optional<ModulePage> findByModuleIdAndSlug(UUID moduleId, String slug);

  boolean existsByModuleIdAndSlug(UUID moduleId, String slug);

  @Query(
      """
      SELECT COALESCE(MAX(p.position), -1)
      FROM ModulePage p
      WHERE p.module.id = :moduleId
        AND ((:parentPageId IS NULL AND p.parentPage IS NULL) OR p.parentPage.id = :parentPageId)
      """)
  Integer findMaxPositionByModuleAndParent(
      @Param("moduleId") UUID moduleId, @Param("parentPageId") UUID parentPageId);
}
