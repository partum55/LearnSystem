package com.university.lms.gradebook.web;

import com.university.lms.gradebook.dto.CourseEffectivenessDto;
import com.university.lms.gradebook.dto.InstructorProductivityDto;
import com.university.lms.gradebook.dto.PlatformUsageDto;
import com.university.lms.gradebook.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for admin analytics and monitoring
 */
@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@Slf4j
public class AdminAnalyticsController {

    private final AdminAnalyticsService analyticsService;

    /**
     * Get platform-wide usage statistics
     */
    @GetMapping("/platform-usage")
    public ResponseEntity<PlatformUsageDto> getPlatformUsage() {
        log.info("Admin requesting platform usage statistics");
        PlatformUsageDto usage = analyticsService.getPlatformUsage();
        return ResponseEntity.ok(usage);
    }

    /**
     * Get course effectiveness metrics for all courses
     */
    @GetMapping("/course-effectiveness")
    public ResponseEntity<List<CourseEffectivenessDto>> getCourseEffectiveness() {
        log.info("Admin requesting course effectiveness metrics");
        List<CourseEffectivenessDto> effectiveness = analyticsService.getCourseEffectiveness();
        return ResponseEntity.ok(effectiveness);
    }

    /**
     * Get course effectiveness for a specific course
     */
    @GetMapping("/course-effectiveness/{courseId}")
    public ResponseEntity<CourseEffectivenessDto> getCourseEffectivenessById(
            @PathVariable Long courseId) {
        log.info("Admin requesting course effectiveness for course {}", courseId);
        CourseEffectivenessDto effectiveness = analyticsService.getCourseEffectivenessById(courseId);
        return ResponseEntity.ok(effectiveness);
    }

    /**
     * Get instructor productivity metrics for all instructors
     */
    @GetMapping("/instructor-productivity")
    public ResponseEntity<List<InstructorProductivityDto>> getInstructorProductivity() {
        log.info("Admin requesting instructor productivity metrics");
        List<InstructorProductivityDto> productivity = analyticsService.getInstructorProductivity();
        return ResponseEntity.ok(productivity);
    }

    /**
     * Get instructor productivity for a specific instructor
     */
    @GetMapping("/instructor-productivity/{instructorId}")
    public ResponseEntity<InstructorProductivityDto> getInstructorProductivityById(
            @PathVariable Long instructorId) {
        log.info("Admin requesting instructor productivity for instructor {}", instructorId);
        InstructorProductivityDto productivity = analyticsService.getInstructorProductivityById(instructorId);
        return ResponseEntity.ok(productivity);
    }
}
