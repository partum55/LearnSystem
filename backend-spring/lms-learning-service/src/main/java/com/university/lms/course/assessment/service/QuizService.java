package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.domain.QuizQuestion;
import com.university.lms.course.assessment.domain.QuestionBank;
import com.university.lms.course.assessment.dto.InlineQuizRequest;
import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.QuizRepository;
import com.university.lms.course.assessment.repository.QuestionBankRepository;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing quizzes.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizService {

    private final QuizRepository quizRepository;
    private final AssignmentRepository assignmentRepository;
    private final QuestionBankRepository questionBankRepository;
    private final AssessmentMapper mapper;

    /**
     * Get quiz by ID.
     */
    @Cacheable(value = "quizzes", key = "#id")
    public QuizDto getQuizById(UUID id) {
        log.debug("Fetching quiz by ID: {}", id);
        Quiz quiz = findQuizById(id);
        return mapAndEnrich(quiz);
    }

    /**
     * Get quizzes by course.
     */
    public PageResponse<QuizDto> getQuizzesByCourse(UUID courseId, Pageable pageable) {
        log.debug("Fetching quizzes for course: {}", courseId);
        Page<Quiz> quizzes = quizRepository.findByCourseId(courseId, pageable);
        return mapToPageResponse(quizzes);
    }

    /**
     * Get quizzes by course (list).
     */
    public List<QuizDto> getQuizzesByCourseList(UUID courseId) {
        log.debug("Fetching quizzes list for course: {}", courseId);
        List<Quiz> quizzes = quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        return quizzes.stream()
                .map(this::mapAndEnrich)
                .collect(Collectors.toList());
    }

    /**
     * Create a new quiz.
     */
    @Transactional
    @CacheEvict(value = "quizzes", allEntries = true)
    public QuizDto createQuiz(UUID courseId, String title, String description, UUID createdBy) {
        log.info("Creating quiz: {} for course: {}", title, courseId);

        Quiz quiz = Quiz.builder()
                .courseId(courseId)
                .title(title)
                .description(description)
                .timeLimit(null)
                .attemptsAllowed(1)
                .shuffleQuestions(false)
                .shuffleAnswers(false)
                .showCorrectAnswers(true)
                .passPercentage(BigDecimal.valueOf(60.00))
                .createdBy(createdBy)
                .build();

        Quiz savedQuiz = quizRepository.save(quiz);
        log.info("Quiz created successfully with ID: {}", savedQuiz.getId());

        return mapAndEnrich(savedQuiz);
    }

    /**
     * Create a quiz in assignment context so it is module-bound.
     */
    @Transactional
    @CacheEvict(value = "quizzes", allEntries = true)
    public QuizDto createQuizForAssignment(
            UUID courseId,
            UUID moduleId,
            InlineQuizRequest request,
            String fallbackTitle,
            UUID createdBy
    ) {
        String resolvedTitle = request.getTitle() != null && !request.getTitle().isBlank()
                ? request.getTitle()
                : fallbackTitle;
        if (resolvedTitle == null || resolvedTitle.isBlank()) {
            throw new ValidationException("Quiz title is required");
        }

        Quiz quiz = Quiz.builder()
                .courseId(courseId)
                .title(resolvedTitle)
                .description(request.getDescription())
                .timeLimit(request.getTimeLimit())
                .attemptsAllowed(request.getAttemptsAllowed() != null ? request.getAttemptsAllowed() : 1)
                .shuffleQuestions(request.getShuffleQuestions() != null ? request.getShuffleQuestions() : false)
                .shuffleAnswers(request.getShuffleAnswers() != null ? request.getShuffleAnswers() : false)
                .showCorrectAnswers(request.getShowCorrectAnswers() != null ? request.getShowCorrectAnswers() : true)
                .showCorrectAnswersAt(request.getShowCorrectAnswersAt())
                .passPercentage(request.getPassPercentage() != null ? request.getPassPercentage() : BigDecimal.valueOf(60.00))
                .createdBy(createdBy)
                .build();

        Quiz savedQuiz = quizRepository.save(quiz);
        QuizDto dto = mapAndEnrich(savedQuiz);
        dto.setModuleId(moduleId);
        return dto;
    }

    /**
     * Update quiz fields from assignment context.
     */
    @Transactional
    @CacheEvict(value = "quizzes", key = "#quizId")
    public QuizDto updateQuizFromAssignment(UUID quizId, InlineQuizRequest updates, UUID userId) {
        Quiz quiz = findQuizById(quizId);
        if (!hasQuizAccess(quiz, userId)) {
            throw new ValidationException("You don't have permission to update this quiz");
        }

        if (updates.getTitle() != null && !updates.getTitle().isBlank()) quiz.setTitle(updates.getTitle());
        if (updates.getDescription() != null) quiz.setDescription(updates.getDescription());
        if (updates.getTimeLimit() != null) quiz.setTimeLimit(updates.getTimeLimit());
        if (updates.getAttemptsAllowed() != null) quiz.setAttemptsAllowed(updates.getAttemptsAllowed());
        if (updates.getShuffleQuestions() != null) quiz.setShuffleQuestions(updates.getShuffleQuestions());
        if (updates.getShuffleAnswers() != null) quiz.setShuffleAnswers(updates.getShuffleAnswers());
        if (updates.getShowCorrectAnswers() != null) quiz.setShowCorrectAnswers(updates.getShowCorrectAnswers());
        if (updates.getShowCorrectAnswersAt() != null) quiz.setShowCorrectAnswersAt(updates.getShowCorrectAnswersAt());
        if (updates.getPassPercentage() != null) quiz.setPassPercentage(updates.getPassPercentage());

        Quiz updatedQuiz = quizRepository.save(quiz);
        return mapAndEnrich(updatedQuiz);
    }

    /**
     * Update quiz.
     */
    @Transactional
    @CacheEvict(value = "quizzes", key = "#id")
    public QuizDto updateQuiz(UUID id, QuizDto updates, UUID userId) {
        log.info("Updating quiz: {}", id);

        Quiz quiz = findQuizById(id);

        // Check permission
        if (!hasQuizAccess(quiz, userId)) {
            throw new ValidationException("You don't have permission to update this quiz");
        }

        if (updates.getTitle() != null) quiz.setTitle(updates.getTitle());
        if (updates.getDescription() != null) quiz.setDescription(updates.getDescription());
        if (updates.getTimeLimit() != null) quiz.setTimeLimit(updates.getTimeLimit());
        if (updates.getAttemptsAllowed() != null) quiz.setAttemptsAllowed(updates.getAttemptsAllowed());
        if (updates.getShuffleQuestions() != null) quiz.setShuffleQuestions(updates.getShuffleQuestions());
        if (updates.getShuffleAnswers() != null) quiz.setShuffleAnswers(updates.getShuffleAnswers());
        if (updates.getShowCorrectAnswers() != null) quiz.setShowCorrectAnswers(updates.getShowCorrectAnswers());
        if (updates.getShowCorrectAnswersAt() != null) quiz.setShowCorrectAnswersAt(updates.getShowCorrectAnswersAt());
        if (updates.getPassPercentage() != null) quiz.setPassPercentage(updates.getPassPercentage());

        Quiz updatedQuiz = quizRepository.save(quiz);
        log.info("Quiz updated successfully: {}", id);

        return mapAndEnrich(updatedQuiz);
    }

    /**
     * Delete quiz.
     */
    @Transactional
    @CacheEvict(value = "quizzes", key = "#id")
    public void deleteQuiz(UUID id, UUID userId) {
        log.info("Deleting quiz: {}", id);

        Quiz quiz = findQuizById(id);

        // Check permission
        if (!hasQuizAccess(quiz, userId)) {
            throw new ValidationException("You don't have permission to delete this quiz");
        }

        quizRepository.delete(quiz);
        log.info("Quiz deleted successfully: {}", id);
    }

    /**
     * Add question to quiz.
     */
    @Transactional
    @CacheEvict(value = "quizzes", key = "#quizId")
    public void addQuestionToQuiz(UUID quizId, UUID questionId, Integer position, BigDecimal pointsOverride, UUID userId) {
        log.info("Adding question {} to quiz {}", questionId, quizId);

        Quiz quiz = findQuizById(quizId);
        QuestionBank question = findQuestionById(questionId);

        // Check permission
        if (!hasQuizAccess(quiz, userId)) {
            throw new ValidationException("You don't have permission to modify this quiz");
        }

        // Check if question already in quiz
        boolean exists = quiz.getQuizQuestions().stream()
                .anyMatch(qq -> qq.getQuestion().getId().equals(questionId));

        if (exists) {
            throw new ValidationException("Question is already in this quiz");
        }

        // Determine position
        int nextPosition = position != null ? position : quiz.getQuizQuestions().size();

        QuizQuestion quizQuestion = QuizQuestion.builder()
                .quiz(quiz)
                .question(question)
                .position(nextPosition)
                .pointsOverride(pointsOverride)
                .build();

        quiz.getQuizQuestions().add(quizQuestion);
        quizRepository.save(quiz);

        log.info("Question added to quiz successfully");
    }

    /**
     * Remove question from quiz.
     */
    @Transactional
    @CacheEvict(value = "quizzes", key = "#quizId")
    public void removeQuestionFromQuiz(UUID quizId, UUID questionId, UUID userId) {
        log.info("Removing question {} from quiz {}", questionId, quizId);

        Quiz quiz = findQuizById(quizId);

        // Check permission
        if (!hasQuizAccess(quiz, userId)) {
            throw new ValidationException("You don't have permission to modify this quiz");
        }

        quiz.getQuizQuestions().removeIf(qq -> qq.getQuestion().getId().equals(questionId));
        quizRepository.save(quiz);

        log.info("Question removed from quiz successfully");
    }

    /**
     * Reorder quiz questions.
     */
    @Transactional
    @CacheEvict(value = "quizzes", key = "#quizId")
    public void reorderQuestions(UUID quizId, List<UUID> questionIds, UUID userId) {
        log.info("Reordering questions for quiz: {}", quizId);

        Quiz quiz = findQuizById(quizId);

        // Check permission
        if (!hasQuizAccess(quiz, userId)) {
            throw new ValidationException("You don't have permission to modify this quiz");
        }

        // Update positions
        for (int i = 0; i < questionIds.size(); i++) {
            UUID questionId = questionIds.get(i);
            final int position = i;

            quiz.getQuizQuestions().stream()
                    .filter(qq -> qq.getQuestion().getId().equals(questionId))
                    .findFirst()
                    .ifPresent(qq -> qq.setPosition(position));
        }

        quizRepository.save(quiz);
        log.info("Questions reordered successfully");
    }

    // Helper methods

    private Quiz findQuizById(UUID id) {
        return quizRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz", "id", id));
    }

    private QuestionBank findQuestionById(UUID id) {
        return questionBankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", id));
    }

    private QuizDto mapAndEnrich(Quiz quiz) {
        QuizDto dto = mapper.toDto(quiz);
        resolveModuleId(quiz.getId()).ifPresent(dto::setModuleId);
        return dto;
    }

    private Optional<UUID> resolveModuleId(UUID quizId) {
        return assignmentRepository.findFirstByQuizId(quizId).map(assignment -> assignment.getModuleId());
    }

    private boolean hasQuizAccess(Quiz quiz, UUID userId) {
        if (quiz.getCreatedBy().equals(userId)) {
            return true;
        }
        return assignmentRepository.findFirstByQuizId(quiz.getId())
                .map(assignment -> assignment.getCreatedBy().equals(userId))
                .orElse(false);
    }

    private PageResponse<QuizDto> mapToPageResponse(Page<Quiz> page) {
        return PageResponse.<QuizDto>builder()
                .content(page.getContent().stream().map(this::mapAndEnrich).toList())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}
