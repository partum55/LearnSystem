package com.university.lms.analytics.controller;

import com.university.lms.analytics.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "AI-powered analytics API for course and student performance analysis")
@SecurityRequirement(name = "Bearer Authentication")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @Operation(
        summary = "Get course statistics",
        description = "Retrieve comprehensive statistics for a specific course including student count, average grades, and completion rates"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved course statistics"),
        @ApiResponse(responseCode = "403", description = "Access denied - requires TEACHER or SUPERADMIN role"),
        @ApiResponse(responseCode = "404", description = "Course not found")
    })
    @GetMapping("/courses/{courseId}/stats")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<?> getCourseStats(
            @Parameter(description = "ID of the course to analyze", required = true)
            @PathVariable String courseId) {
        return ResponseEntity.ok(analyticsService.getCourseStats(courseId));
    }

    @Operation(
        summary = "Get student progress analysis",
        description = "Get detailed progress information for all students in a course, including AI-powered predictions of struggling students"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved student progress data"),
        @ApiResponse(responseCode = "403", description = "Access denied - requires TEACHER or SUPERADMIN role"),
        @ApiResponse(responseCode = "404", description = "Course not found")
    })
    @GetMapping("/courses/{courseId}/student-progress")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<?> getStudentProgress(
            @Parameter(description = "ID of the course to analyze", required = true)
            @PathVariable String courseId) {
        return ResponseEntity.ok(analyticsService.getStudentProgress(courseId));
    }
}
