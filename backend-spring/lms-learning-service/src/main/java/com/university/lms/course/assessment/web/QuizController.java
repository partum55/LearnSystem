package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.service.QuizService;
import com.university.lms.course.web.RequestUserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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
    private final RequestUserContext requestUserContext;

    /**
     * Get quiz by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<QuizDto> getQuiz(@PathVariable UUID id) {
        QuizDto quiz = quizService.getQuizById(id);
        return ResponseEntity.ok(quiz);
    }

    /**
     * Update quiz.
     */
    @PutMapping("/{id}")
    public ResponseEntity<QuizDto> updateQuiz(
            @PathVariable UUID id,
            @RequestBody QuizDto updates) {

        UUID userId = requestUserContext.requireUserId();
        QuizDto quiz = quizService.updateQuiz(id, updates, userId);
        return ResponseEntity.ok(quiz);
    }

    /**
     * Delete quiz.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuiz(
            @PathVariable UUID id) {

        UUID userId = requestUserContext.requireUserId();
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
            @RequestParam(required = false) BigDecimal pointsOverride) {

        UUID userId = requestUserContext.requireUserId();
        quizService.addQuestionToQuiz(quizId, questionId, position, pointsOverride, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Remove question from quiz.
     */
    @DeleteMapping("/{quizId}/questions/{questionId}")
    public ResponseEntity<Void> removeQuestionFromQuiz(
            @PathVariable UUID quizId,
            @PathVariable UUID questionId) {

        UUID userId = requestUserContext.requireUserId();
        quizService.removeQuestionFromQuiz(quizId, questionId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reorder questions.
     */
    @PutMapping("/{quizId}/questions/reorder")
    public ResponseEntity<Void> reorderQuestions(
            @PathVariable UUID quizId,
            @RequestBody List<UUID> questionIds) {

        UUID userId = requestUserContext.requireUserId();
        quizService.reorderQuestions(quizId, questionIds, userId);
        return ResponseEntity.ok().build();
    }
}
