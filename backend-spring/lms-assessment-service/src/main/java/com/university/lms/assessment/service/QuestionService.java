package com.university.lms.assessment.service;

import com.university.lms.assessment.domain.QuestionBank;
import com.university.lms.assessment.dto.QuestionDto;
import com.university.lms.assessment.repository.QuestionBankRepository;
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

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing question bank.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionService {

    private final QuestionBankRepository questionBankRepository;
    private final AssessmentMapper mapper;

    /**
     * Get question by ID.
     */
    @Cacheable(value = "questions", key = "#id")
    public QuestionDto getQuestionById(UUID id) {
        log.debug("Fetching question by ID: {}", id);
        QuestionBank question = findQuestionById(id);
        return mapper.toDto(question);
    }

    /**
     * Get questions by course.
     */
    public PageResponse<QuestionDto> getQuestionsByCourse(UUID courseId, Pageable pageable) {
        log.debug("Fetching questions for course: {}", courseId);
        Page<QuestionBank> questions = questionBankRepository.findByCourseId(courseId, pageable);
        return mapToPageResponse(questions);
    }

    /**
     * Get questions by type.
     */
    public PageResponse<QuestionDto> getQuestionsByType(UUID courseId, String questionType, Pageable pageable) {
        log.debug("Fetching {} questions for course: {}", questionType, courseId);
        Page<QuestionBank> questions = questionBankRepository.findByCourseIdAndQuestionType(courseId, questionType, pageable);
        return mapToPageResponse(questions);
    }

    /**
     * Get global questions (not tied to a course).
     */
    public PageResponse<QuestionDto> getGlobalQuestions(Pageable pageable) {
        log.debug("Fetching global questions");
        Page<QuestionBank> questions = questionBankRepository.findByCourseIdIsNull(pageable);
        return mapToPageResponse(questions);
    }

    /**
     * Search questions.
     */
    public PageResponse<QuestionDto> searchQuestions(UUID courseId, String searchTerm, Pageable pageable) {
        log.debug("Searching questions in course {} with term: {}", courseId, searchTerm);
        Page<QuestionBank> questions = questionBankRepository.searchQuestions(courseId, searchTerm, pageable);
        return mapToPageResponse(questions);
    }

    /**
     * Get questions by difficulty.
     */
    public List<QuestionDto> getQuestionsByDifficulty(UUID courseId, String difficulty) {
        log.debug("Fetching {} questions for course: {}", difficulty, courseId);
        List<QuestionBank> questions = questionBankRepository.findByDifficulty(courseId, difficulty);
        return questions.stream()
            .map(mapper::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Create a new question.
     */
    @Transactional
    @CacheEvict(value = "questions", allEntries = true)
    public QuestionDto createQuestion(QuestionDto questionDto, UUID createdBy) {
        log.info("Creating question of type: {}", questionDto.getQuestionType());

        validateQuestion(questionDto);

        QuestionBank question = QuestionBank.builder()
            .courseId(questionDto.getCourseId())
            .questionType(questionDto.getQuestionType())
            .stem(questionDto.getStem())
            .options(questionDto.getOptions())
            .correctAnswer(questionDto.getCorrectAnswer())
            .explanation(questionDto.getExplanation())
            .points(questionDto.getPoints())
            .metadata(questionDto.getMetadata())
            .createdBy(createdBy)
            .build();

        QuestionBank savedQuestion = questionBankRepository.save(question);
        log.info("Question created successfully with ID: {}", savedQuestion.getId());

        return mapper.toDto(savedQuestion);
    }

    /**
     * Update question.
     */
    @Transactional
    @CacheEvict(value = "questions", key = "#id")
    public QuestionDto updateQuestion(UUID id, QuestionDto updates, UUID userId) {
        log.info("Updating question: {}", id);

        QuestionBank question = findQuestionById(id);

        // Check permission
        if (!question.getCreatedBy().equals(userId)) {
            throw new ValidationException("You don't have permission to update this question");
        }

        if (updates.getStem() != null) question.setStem(updates.getStem());
        if (updates.getOptions() != null) question.setOptions(updates.getOptions());
        if (updates.getCorrectAnswer() != null) question.setCorrectAnswer(updates.getCorrectAnswer());
        if (updates.getExplanation() != null) question.setExplanation(updates.getExplanation());
        if (updates.getPoints() != null) question.setPoints(updates.getPoints());
        if (updates.getMetadata() != null) question.setMetadata(updates.getMetadata());

        QuestionBank updatedQuestion = questionBankRepository.save(question);
        log.info("Question updated successfully: {}", id);

        return mapper.toDto(updatedQuestion);
    }

    /**
     * Delete question.
     */
    @Transactional
    @CacheEvict(value = "questions", key = "#id")
    public void deleteQuestion(UUID id, UUID userId) {
        log.info("Deleting question: {}", id);

        QuestionBank question = findQuestionById(id);

        // Check permission
        if (!question.getCreatedBy().equals(userId)) {
            throw new ValidationException("You don't have permission to delete this question");
        }

        questionBankRepository.delete(question);
        log.info("Question deleted successfully: {}", id);
    }

    /**
     * Duplicate question.
     */
    @Transactional
    public QuestionDto duplicateQuestion(UUID id, UUID userId) {
        log.info("Duplicating question: {}", id);

        QuestionBank original = findQuestionById(id);

        QuestionBank copy = QuestionBank.builder()
            .courseId(original.getCourseId())
            .questionType(original.getQuestionType())
            .stem(original.getStem() + " (Copy)")
            .options(original.getOptions())
            .correctAnswer(original.getCorrectAnswer())
            .explanation(original.getExplanation())
            .points(original.getPoints())
            .metadata(original.getMetadata())
            .createdBy(userId)
            .build();

        QuestionBank savedCopy = questionBankRepository.save(copy);
        log.info("Question duplicated successfully: {} -> {}", id, savedCopy.getId());

        return mapper.toDto(savedCopy);
    }

    // Helper methods

    private QuestionBank findQuestionById(UUID id) {
        return questionBankRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Question", "id", id));
    }

    private void validateQuestion(QuestionDto question) {
        // Validate required fields based on question type
        if (question.getStem() == null || question.getStem().isEmpty()) {
            throw new ValidationException("Question stem is required");
        }

        String type = question.getQuestionType();

        if ("MULTIPLE_CHOICE".equals(type) && (question.getOptions() == null || question.getOptions().isEmpty())) {
            throw new ValidationException("Options are required for multiple choice questions");
        }

        if (question.getCorrectAnswer() == null || question.getCorrectAnswer().isEmpty()) {
            throw new ValidationException("Correct answer is required");
        }
    }

    private PageResponse<QuestionDto> mapToPageResponse(Page<QuestionBank> page) {
        return PageResponse.<QuestionDto>builder()
            .content(page.getContent().stream().map(mapper::toDto).toList())
            .pageNumber(page.getNumber())
            .pageSize(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }
}

