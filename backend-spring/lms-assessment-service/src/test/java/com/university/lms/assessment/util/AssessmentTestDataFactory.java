package com.university.lms.assessment.util;

import com.university.lms.assessment.domain.Quiz;
import com.university.lms.assessment.domain.Assignment;
import com.university.lms.assessment.dto.QuizDto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Test data factory for assessments.
 */
public class AssessmentTestDataFactory {

    public static Quiz createQuiz(UUID courseId, String title) {
        Quiz quiz = new Quiz();
        quiz.setId(UUID.randomUUID());
        quiz.setCourseId(courseId);
        quiz.setTitle(title);
        quiz.setDescription("Test quiz description");
        quiz.setMaxScore(BigDecimal.valueOf(100));
        quiz.setPassingScore(BigDecimal.valueOf(60));
        quiz.setTimeLimit(60); // 60 minutes
        quiz.setMaxAttempts(3);
        quiz.setShuffleQuestions(false);
        quiz.setShowCorrectAnswers(true);
        return quiz;
    }

    public static QuizDto createQuizDto(UUID id, UUID courseId, String title) {
        return QuizDto.builder()
            .id(id)
            .courseId(courseId)
            .title(title)
            .description("Test quiz description")
            .maxScore(BigDecimal.valueOf(100))
            .passingScore(BigDecimal.valueOf(60))
            .timeLimit(60)
            .maxAttempts(3)
            .build();
    }

    public static Assignment createAssignment(UUID courseId, String title) {
        Assignment assignment = new Assignment();
        assignment.setId(UUID.randomUUID());
        assignment.setCourseId(courseId);
        assignment.setTitle(title);
        assignment.setDescription("Test assignment description");
        assignment.setMaxScore(BigDecimal.valueOf(100));
        assignment.setDueDate(LocalDateTime.now().plusDays(7));
        assignment.setAllowLateSubmission(true);
        assignment.setLatePenaltyPercent(BigDecimal.valueOf(10));
        return assignment;
    }
}

