package com.university.lms.course.progress;

import com.university.lms.course.web.RequestUserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/progress")
@RequiredArgsConstructor
public class ContentProgressController {

    private final ContentProgressService progressService;
    private final RequestUserContext requestUserContext;

    @PostMapping("/complete")
    public ResponseEntity<Map<String, Object>> markComplete(@RequestBody Map<String, String> body) {
        UUID userId = requestUserContext.requireUserId();
        UUID courseId = UUID.fromString(body.get("courseId"));
        UUID moduleId = UUID.fromString(body.get("moduleId"));
        String contentType = body.get("contentType");
        UUID contentId = UUID.fromString(body.get("contentId"));

        ContentProgress progress = progressService.markComplete(userId, courseId, moduleId, contentType, contentId);
        return ResponseEntity.ok(Map.of(
            "id", progress.getId(),
            "completedAt", progress.getCompletedAt().toString()
        ));
    }

    @GetMapping("/modules/{moduleId}")
    public ResponseEntity<Map<String, Object>> getModuleProgress(@PathVariable UUID moduleId) {
        UUID userId = requestUserContext.requireUserId();
        return ResponseEntity.ok(progressService.getModuleProgress(userId, moduleId));
    }

    @GetMapping("/courses/{courseId}")
    public ResponseEntity<Map<String, Object>> getCourseProgress(@PathVariable UUID courseId) {
        UUID userId = requestUserContext.requireUserId();
        return ResponseEntity.ok(progressService.getCourseProgress(userId, courseId));
    }
}
