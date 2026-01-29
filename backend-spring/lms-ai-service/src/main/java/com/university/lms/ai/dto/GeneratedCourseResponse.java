package com.university.lms.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for generated course with modules, assignments, and quizzes
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratedCourseResponse {

    @JsonProperty("course")
    @Valid
    @NotNull
    private CourseData course;

    @JsonProperty("modules")
    @Valid
    @NotNull
    @Size(max = 24)
    private List<ModuleData> modules;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseData {
        @NotBlank
        @Size(max = 50)
        private String code;

        @NotBlank
        @Size(max = 255)
        private String titleUk;

        @NotBlank
        @Size(max = 255)
        private String titleEn;

        @NotBlank
        @Size(max = 4000)
        private String descriptionUk;

        @NotBlank
        @Size(max = 4000)
        private String descriptionEn;

        @Size(max = 8000)
        private String syllabus;

        private LocalDate startDate;
        private LocalDate endDate;

        @Size(max = 20)
        private String academicYear;

        @Min(1)
        @Max(1000)
        private Integer maxStudents;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModuleData {
        @NotBlank
        @Size(max = 255)
        private String title;

        @NotBlank
        @Size(max = 5000)
        private String description;

        @NotNull
        @Min(0)
        @Max(100)
        private Integer position;

        @Valid
        @Size(max = 50)
        private List<AssignmentData> assignments;

        @Valid
        @Size(max = 50)
        private List<QuizData> quizzes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentData {
        @NotBlank
        @Size(max = 255)
        private String title;

        @NotBlank
        @Size(max = 5000)
        private String description;

        @NotBlank
        @Size(max = 30)
        private String assignmentType; // QUIZ, FILE_UPLOAD, TEXT, etc.

        @NotBlank
        @Size(max = 8000)
        private String instructions;

        @NotNull
        @Min(0)
        @Max(100)
        private Integer position;

        @Min(1)
        @Max(1000)
        private Integer maxPoints;

        @Min(5)
        @Max(600)
        private Integer timeLimit;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizData {
        @NotBlank
        @Size(max = 255)
        private String title;

        @NotBlank
        @Size(max = 4000)
        private String description;

        @Min(5)
        @Max(180)
        private Integer timeLimit;

        @Min(1)
        @Max(10)
        private Integer attemptsAllowed;

        private Boolean shuffleQuestions;

        @Valid
        @Size(max = 50)
        private List<QuestionData> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionData {
        @NotBlank
        @Size(max = 2000)
        private String questionText;

        @NotBlank
        @Size(max = 50)
        private String questionType; // MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY

        @NotNull
        @Min(1)
        @Max(100)
        private Integer points;

        @Valid
        @Size(max = 10)
        private List<AnswerOptionData> answerOptions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerOptionData {
        @NotBlank
        @Size(max = 500)
        private String text;

        @NotNull
        private Boolean isCorrect;

        @Size(max = 1000)
        private String feedback;
    }
}
