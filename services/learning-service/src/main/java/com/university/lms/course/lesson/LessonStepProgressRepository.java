package com.university.lms.course.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonStepProgressRepository extends JpaRepository<LessonStepProgress, UUID> {
    List<LessonStepProgress> findByUserIdAndLessonId(UUID userId, UUID lessonId);
    Optional<LessonStepProgress> findByUserIdAndStepId(UUID userId, UUID stepId);
    boolean existsByUserIdAndStepId(UUID userId, UUID stepId);
}
