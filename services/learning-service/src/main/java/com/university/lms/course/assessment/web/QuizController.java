package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.dto.DuplicateQuizRequest;
import com.university.lms.course.assessment.dto.AssignmentDto;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.service.AssignmentService;
import com.university.lms.course.assessment.service.QuizService;
import com.university.lms.course.web.RequestUserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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
    private final AssignmentService assignmentService;
    private final AssignmentRepository assignmentRepository;
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
     * Duplicate quiz.
     */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<QuizDto> duplicateQuiz(
            @PathVariable UUID id,
            @RequestBody(required = false) DuplicateQuizRequest request,
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) UUID moduleId) {
        UUID userId = requestUserContext.requireUserId();
        String userRole = requestUserContext.requireUserRole();

        UUID targetCourseId =
                request != null && request.getTargetCourseId() != null
                        ? request.getTargetCourseId()
                        : courseId;
        UUID targetModuleId =
                request != null && request.getTargetModuleId() != null
                        ? request.getTargetModuleId()
                        : moduleId;

        AssignmentDto duplicatedAssignment =
                assignmentRepository.findFirstByQuizId(id)
                        .map(assignment ->
                                assignmentService.duplicateAssignment(
                                        assignment.getId(),
                                        userId,
                                        userRole,
                                        targetCourseId,
                                        targetModuleId))
                        .orElse(null);

        if (duplicatedAssignment != null && duplicatedAssignment.getQuizId() != null) {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(quizService.getQuizById(duplicatedAssignment.getQuizId()));
        }

        QuizDto duplicated =
                quizService.duplicateQuiz(id, userId, userRole, targetCourseId, true);
        return ResponseEntity.status(HttpStatus.CREATED).body(duplicated);
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
