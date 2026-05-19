package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.QuestionBank;
import com.university.lms.course.assessment.dto.QuestionDto;
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
    private final QuestionVersionService questionVersionService;

    /**
     * Get question by ID.
     */
    @Cacheable(value = "questions", key = "#id")
    public QuestionDto getQuestionById(UUID id) {
        log.debug("Fetching question by ID: {}", id);
        QuestionBank question = findQuestionById(id);
        QuestionDto dto = mapper.toDto(question);
        dto.setLatestVersion(questionVersionService.getLatestVersionDto(id).getVersionNumber());
        return dto;
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
            .topic(questionDto.getTopic())
            .difficulty(questionDto.getDifficulty())
            .stem(questionDto.getStem())
            .imageUrl(questionDto.getImageUrl())
            .options(questionDto.getOptions())
            .correctAnswer(questionDto.getCorrectAnswer())
            .explanation(questionDto.getExplanation())
            .points(questionDto.getPoints() == null ? java.math.BigDecimal.ONE : questionDto.getPoints())
            .metadata(questionDto.getMetadata())
            .tags(questionDto.getTags() == null ? java.util.List.of() : questionDto.getTags())
            .createdBy(createdBy)
            .build();

        QuestionBank savedQuestion = questionBankRepository.save(question);
        questionVersionService.createVersionFromQuestion(savedQuestion, createdBy);
        log.info("Question created successfully with ID: {}", savedQuestion.getId());

        QuestionDto dto = mapper.toDto(savedQuestion);
        dto.setLatestVersion(questionVersionService.getLatestVersionDto(savedQuestion.getId()).getVersionNumber());
        return dto;
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
        if (updates.getTopic() != null) question.setTopic(updates.getTopic());
        if (updates.getDifficulty() != null) question.setDifficulty(updates.getDifficulty());
        if (updates.getOptions() != null) question.setOptions(updates.getOptions());
        if (updates.getImageUrl() != null) question.setImageUrl(updates.getImageUrl());
        if (updates.getCorrectAnswer() != null) question.setCorrectAnswer(updates.getCorrectAnswer());
        if (updates.getExplanation() != null) question.setExplanation(updates.getExplanation());
        if (updates.getPoints() != null) question.setPoints(updates.getPoints());
        if (updates.getMetadata() != null) question.setMetadata(updates.getMetadata());
        if (updates.getTags() != null) question.setTags(updates.getTags());

        QuestionBank updatedQuestion = questionBankRepository.save(question);
        questionVersionService.createVersionFromQuestion(updatedQuestion, userId);
        log.info("Question updated successfully: {}", id);

        QuestionDto dto = mapper.toDto(updatedQuestion);
        dto.setLatestVersion(questionVersionService.getLatestVersionDto(updatedQuestion.getId()).getVersionNumber());
        return dto;
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
            .topic(original.getTopic())
            .difficulty(original.getDifficulty())
            .stem(original.getStem() + " (Copy)")
            .imageUrl(original.getImageUrl())
            .options(original.getOptions())
            .correctAnswer(original.getCorrectAnswer())
            .explanation(original.getExplanation())
            .points(original.getPoints())
            .metadata(original.getMetadata())
            .tags(original.getTags())
            .createdBy(userId)
            .build();

        QuestionBank savedCopy = questionBankRepository.save(copy);
        questionVersionService.createVersionFromQuestion(savedCopy, userId);
        log.info("Question duplicated successfully: {} -> {}", id, savedCopy.getId());

        QuestionDto dto = mapper.toDto(savedCopy);
        dto.setLatestVersion(questionVersionService.getLatestVersionDto(savedCopy.getId()).getVersionNumber());
        return dto;
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

        String type = question.getQuestionType() == null ? "" : question.getQuestionType().trim().toUpperCase();

        if (("MULTIPLE_CHOICE".equals(type) || "SINGLE_CHOICE".equals(type) || "MULTIPLE_RESPONSE".equals(type))
            && (question.getOptions() == null || question.getOptions().isEmpty())) {
            throw new ValidationException("Options are required for multiple choice questions");
        }

        boolean manualOnlyType = "ESSAY".equals(type) || "SHORT_ANSWER".equals(type);
        if (!manualOnlyType && (question.getCorrectAnswer() == null || question.getCorrectAnswer().isEmpty())) {
            throw new ValidationException("Correct answer is required");
        }
    }

    private PageResponse<QuestionDto> mapToPageResponse(Page<QuestionBank> page) {
        return PageResponse.<QuestionDto>builder()
            .content(page.getContent().stream().map(this::mapAndEnrich).toList())
            .pageNumber(page.getNumber())
            .pageSize(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }

    private QuestionDto mapAndEnrich(QuestionBank question) {
        QuestionDto dto = mapper.toDto(question);
        dto.setLatestVersion(
            questionVersionService
                .ensureLatestVersion(question.getId(), question.getCreatedBy())
                .getVersionNumber());
        return dto;
    }
}
