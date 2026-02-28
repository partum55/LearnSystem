package com.university.lms.course.assessment.web;

import com.university.lms.course.assessment.dto.CreateQuestionVersionRequest;
import com.university.lms.course.assessment.dto.QuestionVersionDto;
import com.university.lms.course.assessment.service.QuestionVersionService;
import com.university.lms.course.web.RequestUserContext;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** REST controller for question version snapshots. */
@RestController
@RequestMapping("/questions/{questionId}/versions")
@RequiredArgsConstructor
public class QuestionVersionController {

  private final QuestionVersionService questionVersionService;
  private final RequestUserContext requestUserContext;

  @GetMapping
  public ResponseEntity<List<QuestionVersionDto>> listVersions(@PathVariable UUID questionId) {
    return ResponseEntity.ok(questionVersionService.listVersions(questionId));
  }

  @GetMapping("/latest")
  public ResponseEntity<QuestionVersionDto> getLatest(@PathVariable UUID questionId) {
    return ResponseEntity.ok(questionVersionService.getLatestVersionDto(questionId));
  }

  @PostMapping
  public ResponseEntity<QuestionVersionDto> createVersion(
      @PathVariable UUID questionId, @Valid @RequestBody CreateQuestionVersionRequest request) {
    UUID userId = requestUserContext.requireUserId();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(questionVersionService.createExplicitVersion(questionId, request, userId));
  }
}
