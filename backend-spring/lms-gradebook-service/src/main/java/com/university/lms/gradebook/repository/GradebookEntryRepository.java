package com.university.lms.gradebook.repository;

import com.university.lms.gradebook.domain.GradebookEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GradebookEntryRepository extends JpaRepository<GradebookEntry, UUID> {
    List<GradebookEntry> findAllByCourseId(UUID courseId);
    List<GradebookEntry> findByCourseIdAndStudentId(UUID courseId, UUID studentId);
}
