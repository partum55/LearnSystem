package com.university.lms.course.progress;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContentProgressRepository extends JpaRepository<ContentProgress, UUID> {
    List<ContentProgress> findByUserIdAndModuleId(UUID userId, UUID moduleId);
    List<ContentProgress> findByUserIdAndCourseId(UUID userId, UUID courseId);
    Optional<ContentProgress> findByUserIdAndContentTypeAndContentId(UUID userId, String contentType, UUID contentId);
    boolean existsByUserIdAndContentTypeAndContentId(UUID userId, String contentType, UUID contentId);
}
