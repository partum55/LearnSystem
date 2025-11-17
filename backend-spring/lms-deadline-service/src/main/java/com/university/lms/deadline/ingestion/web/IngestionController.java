package com.university.lms.deadline.ingestion.web;

import com.university.lms.deadline.deadline.service.DeadlineIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Webhook endpoint for real-time deadline ingestion.
 */
@RestController
@RequestMapping("/api/ingestion")
@RequiredArgsConstructor
@Slf4j
public class IngestionController {

    private final DeadlineIngestionService ingestionService;

    @PostMapping("/webhook/course/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'SUPERADMIN')")
    public ResponseEntity<Void> ingestCourse(@PathVariable UUID courseId) {
        log.info("Webhook triggered for course {}", courseId);
        ingestionService.ingestFromCourse(courseId);
        return ResponseEntity.accepted().build();
    }
}

