package com.university.lms.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    private CourseData course;

    @JsonProperty("modules")
    private List<ModuleData> modules;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseData {
        private String code;
        private String titleUk;
        private String titleEn;
        private String descriptionUk;
        private String descriptionEn;
        private String syllabus;
        private LocalDate startDate;
        private LocalDate endDate;
        private String academicYear;
        private Integer maxStudents;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModuleData {
        private String title;
        private String description;
        private Integer position;
        private List<AssignmentData> assignments;
        private List<QuizData> quizzes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentData {
        private String title;
        private String description;
        private String assignmentType; // QUIZ, FILE_UPLOAD, TEXT, etc.
        private String instructions;
        private Integer position;
        private Integer maxPoints;
        private Integer timeLimit;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizData {
        private String title;
        private String description;
        private Integer timeLimit;
        private Integer attemptsAllowed;
        private Boolean shuffleQuestions;
        private List<QuestionData> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionData {
        private String questionText;
        private String questionType; // MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY
        private Integer points;
        private List<AnswerOptionData> answerOptions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerOptionData {
        private String text;
        private Boolean isCorrect;
        private String feedback;
    }
}

