package com.university.lms.course.lesson;

import com.university.lms.course.web.RequestUserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/lessons")
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;
    private final RequestUserContext requestUserContext;

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getLesson(@PathVariable UUID id) {
        return ResponseEntity.ok(lessonService.getLessonWithSteps(id));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createLesson(@RequestBody Map<String, String> body) {
        UUID moduleId = UUID.fromString(body.get("moduleId"));
        Lesson lesson = lessonService.createLesson(moduleId, body.get("title"), body.get("summary"));
        Map<String, Object> result = new HashMap<>();
        result.put("id", lesson.getId());
        result.put("moduleId", lesson.getModuleId());
        result.put("title", lesson.getTitle());
        result.put("summary", lesson.getSummary());
        result.put("position", lesson.getPosition());
        result.put("isPublished", lesson.getIsPublished());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateLesson(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String summary = (String) body.get("summary");
        Boolean isPublished = body.containsKey("isPublished") ? (Boolean) body.get("isPublished") : null;
        Lesson lesson = lessonService.updateLesson(id, title, summary, isPublished);
        Map<String, Object> result = new HashMap<>();
        result.put("id", lesson.getId());
        result.put("title", lesson.getTitle());
        result.put("summary", lesson.getSummary());
        result.put("isPublished", lesson.getIsPublished());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/steps")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> addStep(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String blockType = (String) body.get("blockType");
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        List<Map<String, Object>> questions = (List<Map<String, Object>>) body.get("questions");
        LessonStep step = lessonService.addStep(id, blockType, title, content, questions);
        Map<String, Object> result = new HashMap<>();
        result.put("id", step.getId());
        result.put("blockType", step.getBlockType());
        result.put("title", step.getTitle());
        result.put("position", step.getPosition());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/{id}/steps/{stepId}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> updateStep(@PathVariable UUID id, @PathVariable UUID stepId, @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        String blockType = (String) body.get("blockType");
        List<Map<String, Object>> questions = (List<Map<String, Object>>) body.get("questions");
        LessonStep step = lessonService.updateStep(id, stepId, title, content, blockType, questions);
        Map<String, Object> result = new HashMap<>();
        result.put("id", step.getId());
        result.put("blockType", step.getBlockType());
        result.put("title", step.getTitle());
        result.put("content", step.getContent());
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}/steps/{stepId}")
    public ResponseEntity<Void> deleteStep(@PathVariable UUID id, @PathVariable UUID stepId) {
        lessonService.deleteStep(id, stepId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/steps/{stepId}/complete")
    public ResponseEntity<Map<String, Object>> completeStep(@PathVariable UUID id, @PathVariable UUID stepId) {
        UUID userId = requestUserContext.requireUserId();
        LessonStepProgress progress = lessonService.markStepComplete(userId, id, stepId);
        return ResponseEntity.ok(Map.of(
            "stepId", progress.getStepId(),
            "completedAt", progress.getCompletedAt().toString()
        ));
    }

    @GetMapping("/{id}/progress")
    public ResponseEntity<Map<String, Object>> getProgress(@PathVariable UUID id) {
        UUID userId = requestUserContext.requireUserId();
        return ResponseEntity.ok(lessonService.getProgress(userId, id));
    }
}
