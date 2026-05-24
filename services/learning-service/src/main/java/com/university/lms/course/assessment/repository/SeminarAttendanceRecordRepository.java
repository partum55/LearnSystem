package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.SeminarAttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SeminarAttendanceRecordRepository extends JpaRepository<SeminarAttendanceRecord, UUID> {
    List<SeminarAttendanceRecord> findByAssignmentId(UUID assignmentId);
    List<SeminarAttendanceRecord> findBySessionId(UUID sessionId);
    Optional<SeminarAttendanceRecord> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);
    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);
}
