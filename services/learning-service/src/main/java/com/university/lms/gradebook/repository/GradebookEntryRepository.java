package com.university.lms.gradebook.repository;

import com.university.lms.gradebook.domain.GradebookEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GradebookEntryRepository extends JpaRepository<GradebookEntry, UUID> {
    List<GradebookEntry> findAllByCourseId(UUID courseId);
    List<GradebookEntry> findByCourseIdAndStudentId(UUID courseId, UUID studentId);
    List<GradebookEntry> findByAssignmentId(UUID assignmentId);
    Optional<GradebookEntry> findByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);
    List<GradebookEntry> findByCourseIdAndAssignmentIdIn(UUID courseId, List<UUID> assignmentIds);
}
