package com.university.lms.course.assessment.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.university.lms.course.assessment.domain.AttemptScorePolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO for Quiz responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizDto {

    private UUID id;
    private UUID courseId;
    private UUID moduleId;
    private String title;
    private String description;

    private Integer timeLimit;
    private Boolean timerEnabled;
    private Integer attemptsAllowed;
    private Boolean attemptLimitEnabled;
    private AttemptScorePolicy attemptScorePolicy;
    private Boolean secureSessionEnabled;
    private Boolean secureRequireFullscreen;

    private Boolean shuffleQuestions;
    private Boolean shuffleAnswers;

    private Boolean showCorrectAnswers;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime showCorrectAnswersAt;

    private BigDecimal passPercentage;

    private UUID createdBy;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    // Computed fields
    private Integer totalQuestions;
    private BigDecimal totalPoints;
    private List<QuizQuestionDto> questions;
    private List<QuizSectionDto> sections;
}
