package com.university.lms.course.assessment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** JSON import payload for quiz + question bank bootstrap. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizImportRequest {

  @NotNull(message = "courseId is required")
  private UUID courseId;

  @NotBlank(message = "title is required")
  private String title;

  private String description;
  private Integer timeLimit;
  private Integer attemptsAllowed;
  private Boolean shuffleQuestions;
  private Boolean shuffleAnswers;

  @Valid
  @Builder.Default
  private List<QuestionDto> questions = new ArrayList<>();

  @Valid
  @Builder.Default
  private List<UpsertQuizSectionRequest> sections = new ArrayList<>();
}
