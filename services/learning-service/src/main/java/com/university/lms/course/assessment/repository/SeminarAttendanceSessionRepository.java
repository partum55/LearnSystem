package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.SeminarAttendanceSession;
import com.university.lms.course.assessment.domain.SeminarAttendanceSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SeminarAttendanceSessionRepository extends JpaRepository<SeminarAttendanceSession, UUID> {
    List<SeminarAttendanceSession> findByAssignmentId(UUID assignmentId);
    Optional<SeminarAttendanceSession> findByAssignmentIdAndStatus(UUID assignmentId, SeminarAttendanceSessionStatus status);
    Optional<SeminarAttendanceSession> findByTokenHashAndStatus(String tokenHash, SeminarAttendanceSessionStatus status);
}
