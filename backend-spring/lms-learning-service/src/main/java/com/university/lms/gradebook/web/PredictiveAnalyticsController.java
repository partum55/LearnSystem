package com.university.lms.gradebook.web;

import com.university.lms.gradebook.dto.StudentRiskPredictionDto;
import com.university.lms.gradebook.service.PredictiveAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for predictive analytics and at-risk student identification
 */
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
@Slf4j
public class PredictiveAnalyticsController {

    private final PredictiveAnalyticsService analyticsService;

    /**
     * Get at-risk students for a course
     */
    @GetMapping("/courses/{courseId}/at-risk-students")
    public ResponseEntity<List<StudentRiskPredictionDto>> getAtRiskStudents(
            @PathVariable Long courseId) {
        log.info("Fetching at-risk students for course {}", courseId);
        List<StudentRiskPredictionDto> predictions = analyticsService.predictAtRiskStudents(courseId);
        return ResponseEntity.ok(predictions);
    }

    /**
     * Get risk prediction for a specific student in a course
     */
    @GetMapping("/courses/{courseId}/students/{studentId}/risk")
    public ResponseEntity<StudentRiskPredictionDto> getStudentRisk(
            @PathVariable Long courseId,
            @PathVariable Long studentId) {
        log.info("Fetching risk prediction for student {} in course {}", studentId, courseId);
        StudentRiskPredictionDto prediction = analyticsService.predictStudentRisk(studentId, courseId);
        return ResponseEntity.ok(prediction);
    }
}
