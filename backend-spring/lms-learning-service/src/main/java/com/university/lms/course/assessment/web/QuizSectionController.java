package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.QuizSectionDto;
import com.university.lms.course.assessment.dto.UpsertQuizSectionRequest;
import com.university.lms.course.assessment.service.QuizSectionService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** REST controller for quiz section and randomization-rule management. */
@RestController
@RequestMapping("/quizzes/{quizId}/sections")
@RequiredArgsConstructor
public class QuizSectionController {

  private final QuizSectionService quizSectionService;
  private final RequestUserContext requestUserContext;

  @GetMapping
  public ResponseEntity<List<QuizSectionDto>> getSections(@PathVariable UUID quizId) {
    UUID userId = requestUserContext.requireUserId();
    return ResponseEntity.ok(quizSectionService.getSections(quizId, userId));
  }

  @PostMapping
  public ResponseEntity<QuizSectionDto> createSection(
      @PathVariable UUID quizId, @Valid @RequestBody UpsertQuizSectionRequest request) {
    UUID userId = requestUserContext.requireUserId();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(quizSectionService.createSection(quizId, request, userId));
  }

  @PutMapping("/{sectionId}")
  public ResponseEntity<QuizSectionDto> updateSection(
      @PathVariable UUID quizId,
      @PathVariable UUID sectionId,
      @Valid @RequestBody UpsertQuizSectionRequest request) {
    UUID userId = requestUserContext.requireUserId();
    return ResponseEntity.ok(quizSectionService.updateSection(quizId, sectionId, request, userId));
  }

  @DeleteMapping("/{sectionId}")
  public ResponseEntity<Void> deleteSection(
      @PathVariable UUID quizId, @PathVariable UUID sectionId) {
    UUID userId = requestUserContext.requireUserId();
    quizSectionService.deleteSection(quizId, sectionId, userId);
    return ResponseEntity.noContent().build();
  }
}
