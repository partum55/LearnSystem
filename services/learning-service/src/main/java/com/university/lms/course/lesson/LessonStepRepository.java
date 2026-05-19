package com.university.lms.course.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface LessonStepRepository extends JpaRepository<LessonStep, UUID> {
    List<LessonStep> findByLessonIdOrderByPositionAsc(UUID lessonId);
}
