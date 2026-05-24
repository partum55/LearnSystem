package com.university.lms.course.assessment.controller;

import com.university.lms.course.assessment.dto.*;
import com.university.lms.course.assessment.service.SeminarAttendanceService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class SeminarAttendanceController {

    private final SeminarAttendanceService attendanceService;
    private final RequestUserContext userContext;

    @PostMapping("/assignments/{assignmentId}/seminar-attendance/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SeminarAttendanceSessionDto createSession(
            @PathVariable UUID assignmentId) {
        return attendanceService.createSession(assignmentId, userContext.requireUserId());
    }

    @GetMapping("/assignments/{assignmentId}/seminar-attendance")
    public SeminarAttendanceOverviewDto getOverview(
            @PathVariable UUID assignmentId) {
        return attendanceService.getOverview(assignmentId, userContext.requireUserId());
    }

    @PostMapping("/seminar-attendance/check-in")
    public SeminarAttendanceRecordDto checkIn(
            @Valid @RequestBody SeminarAttendanceCheckInRequest request) {
        return attendanceService.checkIn(userContext.requireUserId(), request.token());
    }

    @PostMapping("/seminar-attendance/sessions/{sessionId}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void closeSession(
            @PathVariable UUID sessionId) {
        attendanceService.closeSession(sessionId, userContext.requireUserId());
    }
}
