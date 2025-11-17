package com.university.lms.analytics.controller;

import com.university.lms.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/courses/{courseId}/stats")
    public ResponseEntity<?> getCourseStats(@PathVariable String courseId) {
        return ResponseEntity.ok(analyticsService.getCourseStats(courseId));
    }

    @GetMapping("/courses/{courseId}/student-progress")
    public ResponseEntity<?> getStudentProgress(@PathVariable String courseId) {
        return ResponseEntity.ok(analyticsService.getStudentProgress(courseId));
    }
}

