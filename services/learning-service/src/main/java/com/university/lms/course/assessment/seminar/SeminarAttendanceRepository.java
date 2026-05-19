package com.university.lms.course.assessment.seminar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeminarAttendanceRepository extends JpaRepository<SeminarAttendance, UUID> {
    List<SeminarAttendance> findByAssignmentId(UUID assignmentId);
    Optional<SeminarAttendance> findByAssignmentIdAndUserId(UUID assignmentId, UUID userId);
}
