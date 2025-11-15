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
        quiz.setTimeLimit(60); // minutes
        quiz.setAttemptsAllowed(3);
        quiz.setShuffleQuestions(false);
        quiz.setShuffleAnswers(false);
        quiz.setShowCorrectAnswers(true);
        quiz.setPassPercentage(BigDecimal.valueOf(60));
        quiz.setCreatedBy(UUID.randomUUID());
        return quiz;
    }

    public static QuizDto createQuizDto(UUID id, UUID courseId, String title) {
        return QuizDto.builder()
            .id(id)
            .courseId(courseId)
            .title(title)
            .description("Test quiz description")
            .timeLimit(60)
            .attemptsAllowed(3)
            .shuffleQuestions(false)
            .shuffleAnswers(false)
            .showCorrectAnswers(true)
            .passPercentage(BigDecimal.valueOf(60))
            .totalQuestions(0)
            .totalPoints(BigDecimal.ZERO)
            .build();
    }

    public static Assignment createAssignment(UUID courseId, String title) {
        Assignment assignment = new Assignment();
        assignment.setId(UUID.randomUUID());
        assignment.setCourseId(courseId);
        assignment.setTitle(title);
        assignment.setDescription("Test assignment description");
        assignment.setMaxPoints(BigDecimal.valueOf(100));
        assignment.setDueDate(LocalDateTime.now().plusDays(7));
        assignment.setAllowLateSubmission(true);
        assignment.setLatePenaltyPercent(BigDecimal.valueOf(10));
        assignment.setAssignmentType("FILE_UPLOAD");
        assignment.setCreatedBy(UUID.randomUUID());
        return assignment;
    }
}
