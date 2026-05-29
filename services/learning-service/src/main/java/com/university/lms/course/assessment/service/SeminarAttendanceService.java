package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.*;
import com.university.lms.course.assessment.dto.*;
import com.university.lms.course.assessment.repository.SeminarAttendanceRecordRepository;
import com.university.lms.course.assessment.repository.SeminarAttendanceSessionRepository;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.common.error.ApiException;
import com.university.lms.course.common.security.CourseAccessService;
import com.university.lms.course.gradebook.service.UserProfileClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeminarAttendanceService {

    private final SeminarAttendanceSessionRepository sessionRepository;
    private final SeminarAttendanceRecordRepository recordRepository;
    private final AssignmentRepository assignmentRepository;
    private final CourseAccessService courseAccessService;
    private final UserProfileClient userProfileClient;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public SeminarAttendanceSessionDto createSession(UUID assignmentId, UUID userId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> ApiException.badRequest("ASSIGNMENT_NOT_FOUND", "Assignment not found"));

        if (assignment.getAssignmentType() != AssignmentType.SEMINAR) {
            throw ApiException.badRequest("INVALID_ASSIGNMENT_TYPE", "Attendance can only be managed for SEMINAR assignments");
        }

        courseAccessService.requireTeacherMutation(assignment.getCourseId(), userId);

        // Close any existing active sessions
        sessionRepository.findByAssignmentIdAndStatus(assignmentId, SeminarAttendanceSessionStatus.ACTIVE)
            .ifPresent(existing -> {
                existing.setStatus(SeminarAttendanceSessionStatus.CLOSED);
                existing.setClosedAt(LocalDateTime.now());
                sessionRepository.save(existing);
            });

        // Generate raw token and its hash
        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(15);

        SeminarAttendanceSession session = SeminarAttendanceSession.builder()
            .assignmentId(assignmentId)
            .createdBy(userId)
            .tokenHash(tokenHash)
            .status(SeminarAttendanceSessionStatus.ACTIVE)
            .startsAt(now)
            .expiresAt(expiresAt)
            .build();

        session = sessionRepository.save(session);

        return new SeminarAttendanceSessionDto(
            session.getId(),
            session.getAssignmentId(),
            session.getCreatedBy(),
            session.getStatus(),
            session.getStartsAt(),
            session.getExpiresAt(),
            session.getClosedAt(),
            rawToken
        );
    }

    @Transactional
    public SeminarAttendanceOverviewDto getOverview(UUID assignmentId, UUID userId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> ApiException.badRequest("ASSIGNMENT_NOT_FOUND", "Assignment not found"));

        if (assignment.getAssignmentType() != AssignmentType.SEMINAR) {
            throw ApiException.badRequest("INVALID_ASSIGNMENT_TYPE", "Attendance can only be managed for SEMINAR assignments");
        }

        courseAccessService.requireCourseAccess(assignment.getCourseId(), userId);
        boolean isStaff = courseAccessService.canTeach(assignment.getCourseId(), userId);

        // Fetch active session and handle dynamic expiration
        Optional<SeminarAttendanceSession> sessionOpt = sessionRepository.findByAssignmentIdAndStatus(assignmentId, SeminarAttendanceSessionStatus.ACTIVE);
        if (sessionOpt.isPresent()) {
            SeminarAttendanceSession session = sessionOpt.get();
            if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
                session.setStatus(SeminarAttendanceSessionStatus.EXPIRED);
                sessionRepository.save(session);
                sessionOpt = Optional.empty();
            }
        }

        SeminarAttendanceSessionDto activeSessionDto = sessionOpt.map(session -> new SeminarAttendanceSessionDto(
            session.getId(),
            session.getAssignmentId(),
            session.getCreatedBy(),
            session.getStatus(),
            session.getStartsAt(),
            session.getExpiresAt(),
            session.getClosedAt(),
            null // Raw token never returned on GET overview
        )).orElse(null);

        List<SeminarAttendanceRecordDto> recordDtos = new ArrayList<>();
        int checkedInCount = 0;

        if (isStaff) {
            // Staff sees all checked in records
            List<SeminarAttendanceRecord> records = recordRepository.findByAssignmentId(assignmentId);
            checkedInCount = records.size();
            recordDtos = records.stream()
                .map(this::mapToRecordDto)
                .sorted(Comparator.comparing(SeminarAttendanceRecordDto::checkedInAt).reversed())
                .collect(Collectors.toList());
        } else {
            // Student sees only their own check-in status
            List<SeminarAttendanceRecord> records = recordRepository.findByAssignmentId(assignmentId);
            Optional<SeminarAttendanceRecord> ownRecord = records.stream()
                .filter(r -> r.getStudentId().equals(userId))
                .findFirst();

            if (ownRecord.isPresent()) {
                checkedInCount = 1;
                recordDtos = List.of(mapToRecordDto(ownRecord.get()));
            }
        }

        return new SeminarAttendanceOverviewDto(activeSessionDto, checkedInCount, recordDtos);
    }

    @Transactional
    public SeminarAttendanceRecordDto checkIn(UUID studentUserId, String rawToken) {
        String tokenHash = hashToken(rawToken);

        // Lookup session by token hash
        Optional<SeminarAttendanceSession> sessionOpt = sessionRepository.findByTokenHashAndStatus(tokenHash, SeminarAttendanceSessionStatus.ACTIVE);

        if (sessionOpt.isEmpty()) {
            // Check if there is a session with this token hash but not active
            List<SeminarAttendanceSession> allSessions = sessionRepository.findAll();
            Optional<SeminarAttendanceSession> nonActiveSession = allSessions.stream()
                .filter(s -> s.getTokenHash().equals(tokenHash))
                .findFirst();

            if (nonActiveSession.isPresent()) {
                SeminarAttendanceSession s = nonActiveSession.get();
                if (s.getStatus() == SeminarAttendanceSessionStatus.CLOSED) {
                    throw ApiException.badRequest("SESSION_CLOSED", "This check-in session has been closed by the instructor");
                } else {
                    throw ApiException.badRequest("QR_EXPIRED", "This check-in QR code has expired");
                }
            }
            throw ApiException.badRequest("INVALID_TOKEN", "The provided check-in token is invalid");
        }

        SeminarAttendanceSession session = sessionOpt.get();

        // Validate expiration
        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
            session.setStatus(SeminarAttendanceSessionStatus.EXPIRED);
            sessionRepository.save(session);
            throw ApiException.badRequest("QR_EXPIRED", "This check-in QR code has expired");
        }

        // Validate assignment
        Assignment assignment = assignmentRepository.findById(session.getAssignmentId())
            .orElseThrow(() -> ApiException.badRequest("ASSIGNMENT_NOT_FOUND", "Assignment not found"));

        if (assignment.getAssignmentType() != AssignmentType.SEMINAR) {
            throw ApiException.badRequest("INVALID_ASSIGNMENT_TYPE", "Attendance can only be checked in for SEMINAR assignments");
        }

        // Validate course enrollment
        try {
            courseAccessService.requireStudentMutation(assignment.getCourseId(), studentUserId);
        } catch (Exception e) {
            throw ApiException.badRequest("NOT_ENROLLED", "You are not enrolled in this course");
        }

        // Check double check-in
        if (recordRepository.existsBySessionIdAndStudentId(session.getId(), studentUserId)) {
            throw ApiException.badRequest("ALREADY_CHECKED_IN", "You have already checked in for this seminar");
        }

        SeminarAttendanceRecord record = SeminarAttendanceRecord.builder()
            .sessionId(session.getId())
            .assignmentId(session.getAssignmentId())
            .studentId(studentUserId)
            .status(SeminarAttendanceRecordStatus.PRESENT)
            .method(SeminarAttendanceRecordMethod.QR)
            .checkedInAt(LocalDateTime.now())
            .build();

        record = recordRepository.save(record);

        return mapToRecordDto(record);
    }

    @Transactional
    public void closeSession(UUID sessionId, UUID userId) {
        SeminarAttendanceSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> ApiException.badRequest("SESSION_NOT_FOUND", "Session not found"));

        Assignment assignment = assignmentRepository.findById(session.getAssignmentId())
            .orElseThrow(() -> ApiException.badRequest("ASSIGNMENT_NOT_FOUND", "Assignment not found"));

        courseAccessService.requireTeacherMutation(assignment.getCourseId(), userId);

        if (session.getStatus() == SeminarAttendanceSessionStatus.ACTIVE) {
            session.setStatus(SeminarAttendanceSessionStatus.CLOSED);
            session.setClosedAt(LocalDateTime.now());
            sessionRepository.save(session);
        }
    }

    private SeminarAttendanceRecordDto mapToRecordDto(SeminarAttendanceRecord record) {
        Optional<UserProfileClient.UserProfile> profileOpt = userProfileClient.findProfile(record.getStudentId());
        String name = profileOpt.map(UserProfileClient.UserProfile::displayName).orElse("Unknown Student");
        String email = profileOpt.map(UserProfileClient.UserProfile::email).orElse("");

        return new SeminarAttendanceRecordDto(
            record.getId(),
            record.getSessionId(),
            record.getAssignmentId(),
            record.getStudentId(),
            name,
            email,
            record.getStatus(),
            record.getMethod(),
            record.getCheckedInAt()
        );
    }

    private String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing token", e);
        }
    }
}
