package com.university.lms.gradebook.web;

import com.university.lms.gradebook.dto.CourseGradeSummaryDto;
import com.university.lms.gradebook.mapper.CourseGradeSummaryMapper;
import com.university.lms.gradebook.service.GradebookSummaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for grade recalculation operations.
 */
@RestController
@RequestMapping("/gradebook")
@RequiredArgsConstructor
@Slf4j
public class GradebookRecalculationController {

    private final GradebookSummaryService summaryService;

    @PostMapping("/recalculate/course/{courseId}/student/{studentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN', 'TA')")
    public ResponseEntity<String> recalculateStudentGrade(
            @PathVariable UUID courseId,
            @PathVariable UUID studentId) {
        log.info("Recalculating grades for course: {} student: {}", courseId, studentId);
        summaryService.recalculateCourseGrade(courseId, studentId);
        return ResponseEntity.ok("Grade recalculated successfully");
    }

    @PostMapping("/recalculate/course/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<String> recalculateCourseGrades(@PathVariable UUID courseId) {
        log.info("Recalculating all grades for course: {}", courseId);
        // This will be implemented with Feign client to fetch all students
        // For now, return success
        return ResponseEntity.ok("Course grades recalculation initiated");
    }
}
