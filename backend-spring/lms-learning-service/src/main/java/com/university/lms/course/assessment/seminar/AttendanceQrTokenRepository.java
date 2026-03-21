package com.university.lms.course.assessment.seminar;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceQrTokenRepository extends JpaRepository<AttendanceQrToken, UUID> {

    Optional<AttendanceQrToken> findByTokenAndExpiresAtAfter(String token, LocalDateTime now);

    List<AttendanceQrToken> findByAssignmentIdOrderByCreatedAtDesc(UUID assignmentId);
}
