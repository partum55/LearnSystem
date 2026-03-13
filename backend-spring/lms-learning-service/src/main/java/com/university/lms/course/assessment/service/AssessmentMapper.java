package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.*;
import com.university.lms.course.assessment.dto.*;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Mapper for Assessment entities and DTOs.
 */
@Component
public class AssessmentMapper {

    public AssignmentDto toDto(Assignment assignment) {
        if (assignment == null) {
            return null;
        }

        return AssignmentDto.builder()
            .id(assignment.getId())
            .courseId(assignment.getCourseId())
            .moduleId(assignment.getModuleId())
            .topicId(assignment.getTopicId())
            .categoryId(assignment.getCategoryId())
            .position(assignment.getPosition())
            .assignmentType(assignment.getAssignmentType())
            .title(assignment.getTitle())
            .description(assignment.getDescription())
            .descriptionFormat(assignment.getDescriptionFormat())
            .instructions(assignment.getInstructions())
            .instructionsFormat(assignment.getInstructionsFormat())
            .resources(assignment.getResources())
            .starterCode(assignment.getStarterCode())
            .programmingLanguage(assignment.getProgrammingLanguage())
            .autoGradingEnabled(assignment.getAutoGradingEnabled())
            .testCases(assignment.getTestCases())
            .maxPoints(assignment.getMaxPoints())
            .dueDate(assignment.getDueDate())
            .availableFrom(assignment.getAvailableFrom())
            .availableUntil(assignment.getAvailableUntil())
            .allowLateSubmission(assignment.getAllowLateSubmission())
            .latePenaltyPercent(assignment.getLatePenaltyPercent())
            .submissionTypes(assignment.getSubmissionTypes())
            .allowedFileTypes(assignment.getAllowedFileTypes())
            .maxFileSize(assignment.getMaxFileSize())
            .maxFiles(assignment.getMaxFiles())
            .quizId(assignment.getQuizId())
            .externalToolUrl(assignment.getExternalToolUrl())
            .gradeAnonymously(assignment.getGradeAnonymously())
            .peerReviewEnabled(assignment.getPeerReviewEnabled())
            .peerReviewsRequired(assignment.getPeerReviewsRequired())
            .tags(assignment.getTags())
            .estimatedDuration(assignment.getEstimatedDuration())
            .isTemplate(assignment.getIsTemplate())
            .isArchived(assignment.getIsArchived())
            .originalAssignmentId(assignment.getOriginalAssignmentId())
            .isPublished(assignment.getIsPublished())
            .createdAt(assignment.getCreatedAt())
            .updatedAt(assignment.getUpdatedAt())
            .createdBy(assignment.getCreatedBy())
            .isAvailable(assignment.isAvailable())
            .isOverdue(assignment.isOverdue())
            .requiresSubmission(assignment.requiresSubmission())
            .build();
    }

    public Assignment toEntity(CreateAssignmentRequest request, java.util.UUID createdBy) {
        if (request == null) {
            return null;
        }

        return Assignment.builder()
            .courseId(request.getCourseId())
            .moduleId(request.getModuleId())
            .topicId(request.getTopicId())
            .categoryId(request.getCategoryId())
            .position(request.getPosition() != null ? request.getPosition() : 0)
            .assignmentType(request.getAssignmentType())
            .title(request.getTitle())
            .description(request.getDescription())
            .descriptionFormat(request.getDescriptionFormat() != null ? request.getDescriptionFormat() : "MARKDOWN")
            .instructions(request.getInstructions())
            .instructionsFormat(request.getInstructionsFormat() != null ? request.getInstructionsFormat() : "MARKDOWN")
            .resources(request.getResources())
            .starterCode(request.getStarterCode())
            .programmingLanguage(request.getProgrammingLanguage())
            .autoGradingEnabled(request.getAutoGradingEnabled() != null ? request.getAutoGradingEnabled() : false)
            .testCases(request.getTestCases())
            .maxPoints(request.getMaxPoints() != null ? request.getMaxPoints() : java.math.BigDecimal.valueOf(100))
            .dueDate(request.getDueDate())
            .availableFrom(request.getAvailableFrom())
            .availableUntil(request.getAvailableUntil())
            .allowLateSubmission(request.getAllowLateSubmission() != null ? request.getAllowLateSubmission() : false)
            .latePenaltyPercent(request.getLatePenaltyPercent() != null ? request.getLatePenaltyPercent() : java.math.BigDecimal.ZERO)
            .submissionTypes(request.getSubmissionTypes())
            .allowedFileTypes(request.getAllowedFileTypes())
            .maxFileSize(request.getMaxFileSize() != null ? request.getMaxFileSize() : 10485760L)
            .maxFiles(request.getMaxFiles() != null ? request.getMaxFiles() : 5)
            .quizId(request.getQuizId())
            .externalToolUrl(request.getExternalToolUrl())
            .gradeAnonymously(request.getGradeAnonymously() != null ? request.getGradeAnonymously() : false)
            .peerReviewEnabled(request.getPeerReviewEnabled() != null ? request.getPeerReviewEnabled() : false)
            .peerReviewsRequired(request.getPeerReviewsRequired() != null ? request.getPeerReviewsRequired() : 0)
            .tags(request.getTags())
            .estimatedDuration(request.getEstimatedDuration())
            .isTemplate(request.getIsTemplate() != null ? request.getIsTemplate() : false)
            .isArchived(false)
            .isPublished(request.getIsPublished() != null ? request.getIsPublished() : false)
            .createdBy(createdBy)
            .build();
    }

    public void updateEntity(Assignment assignment, UpdateAssignmentRequest request) {
        if (request == null) {
            return;
        }

        if (request.getModuleId() != null) assignment.setModuleId(request.getModuleId());
        if (request.getTopicId() != null) assignment.setTopicId(request.getTopicId());
        if (request.getCategoryId() != null) assignment.setCategoryId(request.getCategoryId());
        if (request.getPosition() != null) assignment.setPosition(request.getPosition());
        if (request.getTitle() != null) assignment.setTitle(request.getTitle());
        if (request.getDescription() != null) assignment.setDescription(request.getDescription());
        if (request.getDescriptionFormat() != null) assignment.setDescriptionFormat(request.getDescriptionFormat());
        if (request.getInstructions() != null) assignment.setInstructions(request.getInstructions());
        if (request.getInstructionsFormat() != null) assignment.setInstructionsFormat(request.getInstructionsFormat());
        if (request.getResources() != null) assignment.setResources(request.getResources());
        if (request.getStarterCode() != null) assignment.setStarterCode(request.getStarterCode());
        if (request.getProgrammingLanguage() != null) assignment.setProgrammingLanguage(request.getProgrammingLanguage());
        if (request.getAutoGradingEnabled() != null) assignment.setAutoGradingEnabled(request.getAutoGradingEnabled());
        if (request.getTestCases() != null) assignment.setTestCases(request.getTestCases());
        if (request.getMaxPoints() != null) assignment.setMaxPoints(request.getMaxPoints());
        if (request.getDueDate() != null) assignment.setDueDate(request.getDueDate());
        if (request.getAvailableFrom() != null) assignment.setAvailableFrom(request.getAvailableFrom());
        if (request.getAvailableUntil() != null) assignment.setAvailableUntil(request.getAvailableUntil());
        if (request.getAllowLateSubmission() != null) assignment.setAllowLateSubmission(request.getAllowLateSubmission());
        if (request.getLatePenaltyPercent() != null) assignment.setLatePenaltyPercent(request.getLatePenaltyPercent());
        if (request.getSubmissionTypes() != null) assignment.setSubmissionTypes(request.getSubmissionTypes());
        if (request.getAllowedFileTypes() != null) assignment.setAllowedFileTypes(request.getAllowedFileTypes());
        if (request.getMaxFileSize() != null) assignment.setMaxFileSize(request.getMaxFileSize());
        if (request.getMaxFiles() != null) assignment.setMaxFiles(request.getMaxFiles());
        if (request.getQuizId() != null) assignment.setQuizId(request.getQuizId());
        if (request.getExternalToolUrl() != null) assignment.setExternalToolUrl(request.getExternalToolUrl());
        if (request.getGradeAnonymously() != null) assignment.setGradeAnonymously(request.getGradeAnonymously());
        if (request.getPeerReviewEnabled() != null) assignment.setPeerReviewEnabled(request.getPeerReviewEnabled());
        if (request.getPeerReviewsRequired() != null) assignment.setPeerReviewsRequired(request.getPeerReviewsRequired());
        if (request.getTags() != null) assignment.setTags(request.getTags());
        if (request.getEstimatedDuration() != null) assignment.setEstimatedDuration(request.getEstimatedDuration());
        if (request.getIsArchived() != null) assignment.setIsArchived(request.getIsArchived());
        if (request.getIsPublished() != null) assignment.setIsPublished(request.getIsPublished());
    }

    public QuizDto toDto(Quiz quiz) {
        if (quiz == null) {
            return null;
        }

        QuizDto dto = QuizDto.builder()
            .id(quiz.getId())
            .courseId(quiz.getCourseId())
            .title(quiz.getTitle())
            .description(quiz.getDescription())
            .timeLimit(quiz.getTimeLimit())
            .timerEnabled(quiz.getTimerEnabled())
            .attemptsAllowed(quiz.getAttemptsAllowed())
            .attemptLimitEnabled(quiz.getAttemptLimitEnabled())
            .attemptScorePolicy(quiz.getAttemptScorePolicy())
            .secureSessionEnabled(quiz.getSecureSessionEnabled())
            .secureRequireFullscreen(quiz.getSecureRequireFullscreen())
            .shuffleQuestions(quiz.getShuffleQuestions())
            .shuffleAnswers(quiz.getShuffleAnswers())
            .showCorrectAnswers(quiz.getShowCorrectAnswers())
            .showCorrectAnswersAt(quiz.getShowCorrectAnswersAt())
            .passPercentage(quiz.getPassPercentage())
            .createdBy(quiz.getCreatedBy())
            .createdAt(quiz.getCreatedAt())
            .updatedAt(quiz.getUpdatedAt())
            .totalQuestions(quiz.getTotalQuestions())
            .totalPoints(quiz.getTotalPoints())
            .build();

        // Include questions if loaded
        if (quiz.getQuizQuestions() != null && !quiz.getQuizQuestions().isEmpty()) {
            dto.setQuestions(quiz.getQuizQuestions().stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
        }

        if (quiz.getSections() != null && !quiz.getSections().isEmpty()) {
            dto.setSections(quiz.getSections().stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
        }

        return dto;
    }

    public QuizSectionDto toDto(QuizSection section) {
        if (section == null) {
            return null;
        }

        return QuizSectionDto.builder()
            .id(section.getId())
            .quizId(section.getQuiz().getId())
            .title(section.getTitle())
            .position(section.getPosition())
            .questionCount(section.getQuestionCount())
            .rules(section.getRules() == null ? java.util.List.of()
                : section.getRules().stream().map(this::toDto).collect(Collectors.toList()))
            .build();
    }

    public QuizSectionRuleDto toDto(QuizSectionRule rule) {
        if (rule == null) {
            return null;
        }

        return QuizSectionRuleDto.builder()
            .id(rule.getId())
            .questionType(rule.getQuestionType())
            .difficulty(rule.getDifficulty())
            .tag(rule.getTag())
            .quota(rule.getQuota())
            .build();
    }

    public QuizQuestionDto toDto(QuizQuestion quizQuestion) {
        if (quizQuestion == null) {
            return null;
        }

        return QuizQuestionDto.builder()
            .id(quizQuestion.getId())
            .quizId(quizQuestion.getQuiz().getId())
            .questionId(quizQuestion.getQuestion().getId())
            .position(quizQuestion.getPosition())
            .pointsOverride(quizQuestion.getPointsOverride())
            .effectivePoints(quizQuestion.getEffectivePoints())
            .question(toDto(quizQuestion.getQuestion()))
            .build();
    }

    public QuestionDto toDto(QuestionBank question) {
        if (question == null) {
            return null;
        }

        return QuestionDto.builder()
            .id(question.getId())
            .courseId(question.getCourseId())
            .questionType(question.getQuestionType())
            .topic(question.getTopic())
            .difficulty(question.getDifficulty())
            .stem(question.getStem())
            .imageUrl(question.getImageUrl())
            .options(question.getOptions())
            .correctAnswer(question.getCorrectAnswer())
            .explanation(question.getExplanation())
            .points(question.getPoints())
            .metadata(question.getMetadata())
            .tags(question.getTags())
            .createdBy(question.getCreatedBy())
            .createdAt(question.getCreatedAt())
            .updatedAt(question.getUpdatedAt())
            .build();
    }

    public QuizAttemptDto toDto(QuizAttempt quizAttempt) {
        if (quizAttempt == null) {
            return null;
        }

        LocalDateTime expiresAt = null;
        Long remainingSeconds = null;
        Boolean timedOut = false;

        Quiz quiz = quizAttempt.getQuiz();
        if (quiz != null
            && Boolean.TRUE.equals(quiz.getTimerEnabled())
            && quiz.getTimeLimit() != null
            && quizAttempt.getStartedAt() != null) {
            expiresAt = quizAttempt.getStartedAt().plusMinutes(quiz.getTimeLimit());
            long secondsLeft = Duration.between(LocalDateTime.now(), expiresAt).getSeconds();
            remainingSeconds = Math.max(0L, secondsLeft);
            timedOut = !quizAttempt.isSubmitted() && secondsLeft <= 0;
        }

        return QuizAttemptDto.builder()
            .id(quizAttempt.getId())
            .quizId(quizAttempt.getQuiz() != null ? quizAttempt.getQuiz().getId() : null)
            .userId(quizAttempt.getUserId())
            .attemptNumber(quizAttempt.getAttemptNumber())
            .startedAt(quizAttempt.getStartedAt())
            .submittedAt(quizAttempt.getSubmittedAt())
            .answers(quizAttempt.getAnswers())
            .autoScore(quizAttempt.getAutoScore())
            .manualScore(quizAttempt.getManualScore())
            .finalScore(quizAttempt.getFinalScore())
            .gradedBy(quizAttempt.getGradedBy())
            .gradedAt(quizAttempt.getGradedAt())
            .feedback(quizAttempt.getFeedback())
            .ipAddress(quizAttempt.getIpAddress())
            .browserFingerprint(quizAttempt.getBrowserFingerprint())
            .proctoringData(quizAttempt.getProctoringData())
            .submitted(quizAttempt.isSubmitted())
            .graded(quizAttempt.isGraded())
            .inProgress(quizAttempt.isInProgress())
            .durationInMinutes(quizAttempt.getDurationInMinutes())
            .expiresAt(expiresAt)
            .remainingSeconds(remainingSeconds)
            .timedOut(timedOut)
            .build();
    }
}
