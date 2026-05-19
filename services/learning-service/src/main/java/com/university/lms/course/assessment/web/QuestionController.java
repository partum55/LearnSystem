package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.QuestionDto;
import com.university.lms.course.assessment.service.QuestionService;
import com.university.lms.course.web.RequestUserContext;
import com.university.lms.common.dto.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for question bank management.
 */
@RestController
@RequestMapping("/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;
    private final RequestUserContext requestUserContext;

    /**
     * Get question by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<QuestionDto> getQuestion(@PathVariable UUID id) {
        QuestionDto question = questionService.getQuestionById(id);
        return ResponseEntity.ok(question);
    }

    /**
     * Get questions by course.
     */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<PageResponse<QuestionDto>> getQuestionsByCourse(
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        PageResponse<QuestionDto> questions = questionService.getQuestionsByCourse(courseId, pageable);
        return ResponseEntity.ok(questions);
    }

    /**
     * Get questions by type.
     */
    @GetMapping("/course/{courseId}/type/{type}")
    public ResponseEntity<PageResponse<QuestionDto>> getQuestionsByType(
            @PathVariable UUID courseId,
            @PathVariable String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageResponse<QuestionDto> questions = questionService.getQuestionsByType(courseId, type, pageable);
        return ResponseEntity.ok(questions);
    }

    /**
     * Get global questions.
     */
    @GetMapping("/global")
    public ResponseEntity<PageResponse<QuestionDto>> getGlobalQuestions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageResponse<QuestionDto> questions = questionService.getGlobalQuestions(pageable);
        return ResponseEntity.ok(questions);
    }

    /**
     * Search questions.
     */
    @GetMapping("/course/{courseId}/search")
    public ResponseEntity<PageResponse<QuestionDto>> searchQuestions(
            @PathVariable UUID courseId,
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageResponse<QuestionDto> questions = questionService.searchQuestions(courseId, q, pageable);
        return ResponseEntity.ok(questions);
    }

    /**
     * Get questions by difficulty.
     */
    @GetMapping("/course/{courseId}/difficulty/{difficulty}")
    public ResponseEntity<List<QuestionDto>> getQuestionsByDifficulty(
            @PathVariable UUID courseId,
            @PathVariable String difficulty) {

        List<QuestionDto> questions = questionService.getQuestionsByDifficulty(courseId, difficulty);
        return ResponseEntity.ok(questions);
    }

    /**
     * Create question.
     */
    @PostMapping
    public ResponseEntity<QuestionDto> createQuestion(
            @Valid @RequestBody QuestionDto question) {

        UUID createdBy = requestUserContext.requireUserId();
        QuestionDto created = questionService.createQuestion(question, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update question.
     */
    @PutMapping("/{id}")
    public ResponseEntity<QuestionDto> updateQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody QuestionDto updates) {

        UUID userId = requestUserContext.requireUserId();
        QuestionDto question = questionService.updateQuestion(id, updates, userId);
        return ResponseEntity.ok(question);
    }

    /**
     * Delete question.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuestion(
            @PathVariable UUID id) {

        UUID userId = requestUserContext.requireUserId();
        questionService.deleteQuestion(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Duplicate question.
     */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<QuestionDto> duplicateQuestion(
            @PathVariable UUID id) {

        UUID userId = requestUserContext.requireUserId();
        QuestionDto question = questionService.duplicateQuestion(id, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(question);
    }
}
