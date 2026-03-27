package com.university.lms.course.assessment.seminar;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.submission.domain.Submission;
import com.university.lms.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class SeminarAttendanceService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final SeminarAttendanceRepository attendanceRepository;
    private final AttendanceQrTokenRepository qrTokenRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;

    @Transactional
    public List<SeminarAttendance> markAttendance(UUID assignmentId, List<AttendanceEntry> entries, UUID markedBy) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", assignmentId));

        if (!"SEMINAR".equals(assignment.getAssignmentType())) {
            throw new ValidationException("Attendance can only be marked for SEMINAR assignments");
        }

        List<SeminarAttendance> results = new ArrayList<>();
        for (AttendanceEntry entry : entries) {
            SeminarAttendance attendance = attendanceRepository
                    .findByAssignmentIdAndUserId(assignmentId, entry.getUserId())
                    .orElse(SeminarAttendance.builder()
                            .assignmentId(assignmentId)
                            .userId(entry.getUserId())
                            .build());

            attendance.setAttended(entry.getAttended());
            attendance.setMarkedBy(markedBy);
            attendance.setMarkedAt(LocalDateTime.now());
            attendance.setNotes(entry.getNotes());
            results.add(attendanceRepository.save(attendance));

            // Create submission for attended students so they appear in SpeedGrader for grading
            if (Boolean.TRUE.equals(entry.getAttended())) {
                createSubmissionIfNotExists(assignmentId, entry.getUserId());
            }
        }
        return results;
    }

    public List<SeminarAttendance> getAttendance(UUID assignmentId) {
        return attendanceRepository.findByAssignmentId(assignmentId);
    }

    @Transactional
    public AttendanceQrToken generateQrToken(UUID assignmentId, UUID createdBy, int expiryMinutes) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", "id", assignmentId));

        if (!"SEMINAR".equals(assignment.getAssignmentType())) {
            throw new ValidationException("QR attendance is only available for SEMINAR assignments");
        }

        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        AttendanceQrToken qrToken = AttendanceQrToken.builder()
                .assignmentId(assignmentId)
                .token(token)
                .expiresAt(LocalDateTime.now().plusMinutes(expiryMinutes))
                .createdBy(createdBy)
                .build();

        return qrTokenRepository.save(qrToken);
    }

    @Transactional
    public void checkinWithToken(UUID assignmentId, String token, UUID studentId) {
        AttendanceQrToken qrToken = qrTokenRepository
                .findByTokenAndExpiresAtAfter(token, LocalDateTime.now())
                .orElseThrow(() -> new ValidationException("QR code has expired or is invalid"));

        if (!qrToken.getAssignmentId().equals(assignmentId)) {
            throw new ValidationException("Token does not match this assignment");
        }

        AttendanceEntry entry = new AttendanceEntry();
        entry.setUserId(studentId);
        entry.setAttended(true);
        entry.setNotes("QR check-in");
        markAttendance(assignmentId, List.of(entry), studentId);
    }

    public byte[] generateQrImage(String content) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 400, 400);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (WriterException | IOException e) {
            throw new ValidationException("Failed to generate QR code image");
        }
    }

    private void createSubmissionIfNotExists(UUID assignmentId, UUID userId) {
        boolean alreadyExists = submissionRepository
                .findByAssignmentIdAndUserId(assignmentId, userId)
                .isPresent();
        if (alreadyExists) {
            log.debug("Submission already exists for assignment {} user {}", assignmentId, userId);
            return;
        }
        Submission submission = Submission.builder()
                .assignmentId(assignmentId)
                .userId(userId)
                .status("IN_REVIEW")
                .submittedAt(LocalDateTime.now())
                .build();
        submissionRepository.save(submission);
        log.debug("Created attendance submission for assignment {} user {}", assignmentId, userId);
    }
}
