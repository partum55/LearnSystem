package com.university.lms.assessment.web;

import com.university.lms.assessment.dto.QuizDto;
import com.university.lms.assessment.service.QuizService;
import com.university.lms.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller for quiz management.
 */
@RestController
@RequestMapping("/quizzes")
@RequiredArgsConstructor
@Slf4j
public class QuizController {

    private final QuizService quizService;

    /**
     * Get quiz by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<QuizDto> getQuiz(@PathVariable UUID id) {
        QuizDto quiz = quizService.getQuizById(id);
        return ResponseEntity.ok(quiz);
    }

    /**
     * Get quizzes by course.
     */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<PageResponse<QuizDto>> getQuizzesByCourse(
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        PageResponse<QuizDto> quizzes = quizService.getQuizzesByCourse(courseId, pageable);
        return ResponseEntity.ok(quizzes);
    }

    /**
     * Get quizzes by course (list).
     */
    @GetMapping("/course/{courseId}/list")
    public ResponseEntity<List<QuizDto>> getQuizzesByCourseList(@PathVariable UUID courseId) {
        List<QuizDto> quizzes = quizService.getQuizzesByCourseList(courseId);
        return ResponseEntity.ok(quizzes);
    }

    /**
     * Create quiz.
     */
    @PostMapping
    public ResponseEntity<QuizDto> createQuiz(
            @RequestParam UUID courseId,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            Authentication authentication) {

        UUID createdBy = extractUserId(authentication);
        QuizDto quiz = quizService.createQuiz(courseId, title, description, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(quiz);
    }

    /**
     * Update quiz.
     */
    @PutMapping("/{id}")
    public ResponseEntity<QuizDto> updateQuiz(
            @PathVariable UUID id,
            @RequestBody QuizDto updates,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        QuizDto quiz = quizService.updateQuiz(id, updates, userId);
        return ResponseEntity.ok(quiz);
    }

    /**
     * Delete quiz.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuiz(
            @PathVariable UUID id,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        quizService.deleteQuiz(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Add question to quiz.
     */
    @PostMapping("/{quizId}/questions/{questionId}")
    public ResponseEntity<Void> addQuestionToQuiz(
            @PathVariable UUID quizId,
            @PathVariable UUID questionId,
            @RequestParam(required = false) Integer position,
            @RequestParam(required = false) BigDecimal pointsOverride,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        quizService.addQuestionToQuiz(quizId, questionId, position, pointsOverride, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Remove question from quiz.
     */
    @DeleteMapping("/{quizId}/questions/{questionId}")
    public ResponseEntity<Void> removeQuestionFromQuiz(
            @PathVariable UUID quizId,
            @PathVariable UUID questionId,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        quizService.removeQuestionFromQuiz(quizId, questionId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reorder questions.
     */
    @PutMapping("/{quizId}/questions/reorder")
    public ResponseEntity<Void> reorderQuestions(
            @PathVariable UUID quizId,
            @RequestBody List<UUID> questionIds,
            Authentication authentication) {

        UUID userId = extractUserId(authentication);
        quizService.reorderQuestions(quizId, questionIds, userId);
        return ResponseEntity.ok().build();
    }

    // Helper method
    private UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() != null) {
            return UUID.fromString(authentication.getName());
        }
        throw new RuntimeException("User not authenticated");
    }
}

