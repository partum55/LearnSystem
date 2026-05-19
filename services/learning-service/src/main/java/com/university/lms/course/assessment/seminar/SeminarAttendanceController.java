package com.university.lms.course.assessment.seminar;

import com.university.lms.course.web.RequestUserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/assignments")
@RequiredArgsConstructor
public class SeminarAttendanceController {

    private final SeminarAttendanceService attendanceService;
    private final RequestUserContext requestUserContext;

    @PostMapping("/{id}/attendance")
    public ResponseEntity<List<Map<String, Object>>> markAttendance(
            @PathVariable UUID id,
            @RequestBody List<AttendanceEntry> entries) {
        UUID markedBy = requestUserContext.requireUserId();
        List<SeminarAttendance> results = attendanceService.markAttendance(id, entries, markedBy);
        return ResponseEntity.ok(results.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/{id}/attendance")
    public ResponseEntity<List<Map<String, Object>>> getAttendance(@PathVariable UUID id) {
        List<SeminarAttendance> attendance = attendanceService.getAttendance(id);
        return ResponseEntity.ok(attendance.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping("/{id}/attendance/qr")
    public ResponseEntity<Map<String, Object>> generateQrToken(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "10") int expiryMinutes) {
        UUID userId = requestUserContext.requireUserId();
        AttendanceQrToken qrToken = attendanceService.generateQrToken(id, userId, expiryMinutes);
        Map<String, Object> result = new HashMap<>();
        result.put("token", qrToken.getToken());
        result.put("expiresAt", qrToken.getExpiresAt());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/attendance/checkin")
    public ResponseEntity<Map<String, String>> checkinWithToken(
            @PathVariable UUID id,
            @RequestParam String token) {
        UUID studentId = requestUserContext.requireUserId();
        attendanceService.checkinWithToken(id, token, studentId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @GetMapping(value = "/{id}/attendance/qr/{token}/image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getQrImage(
            @PathVariable UUID id,
            @PathVariable String token,
            @RequestParam(required = false) String baseUrl) {
        String checkinUrl = (baseUrl != null ? baseUrl : "")
                + "/assignments/" + id + "/attendance/checkin?token=" + token;
        byte[] image = attendanceService.generateQrImage(checkinUrl);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(image);
    }

    private Map<String, Object> toMap(SeminarAttendance a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId());
        map.put("assignmentId", a.getAssignmentId());
        map.put("userId", a.getUserId());
        map.put("attended", a.getAttended());
        map.put("markedBy", a.getMarkedBy());
        map.put("markedAt", a.getMarkedAt());
        map.put("notes", a.getNotes());
        return map;
    }
}
