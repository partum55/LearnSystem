package com.university.lms.course.assessment.service;

import com.university.lms.course.assessment.domain.AttemptScorePolicy;
import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.domain.QuizQuestion;
import com.university.lms.course.assessment.domain.QuestionBank;
import com.university.lms.course.assessment.domain.QuizSection;
import com.university.lms.course.assessment.domain.QuizSectionRule;
import com.university.lms.course.assessment.dto.InlineQuizRequest;
import com.university.lms.course.assessment.dto.InlineQuizQuestionRequest;
import com.university.lms.course.assessment.dto.QuizDto;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.QuizRepository;
import com.university.lms.course.assessment.repository.QuestionBankRepository;
import com.university.lms.common.dto.PageResponse;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.domain.Course;
import com.university.lms.course.repository.CourseMemberRepository;
import com.university.lms.course.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
    private final QuestionVersionService questionVersionService;
    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
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
                .timerEnabled(false)
                .attemptsAllowed(null)
                .attemptLimitEnabled(false)
                .attemptScorePolicy(AttemptScorePolicy.HIGHEST)
                .secureSessionEnabled(false)
                .secureRequireFullscreen(true)
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

        boolean timerEnabled =
            request.getTimerEnabled() != null
                ? request.getTimerEnabled()
                : request.getTimeLimit() != null;
        boolean attemptLimitEnabled =
            request.getAttemptLimitEnabled() != null
                ? request.getAttemptLimitEnabled()
                : request.getAttemptsAllowed() != null;

        Quiz quiz = Quiz.builder()
                .courseId(courseId)
                .title(resolvedTitle)
                .description(request.getDescription())
                .timeLimit(timerEnabled ? (request.getTimeLimit() != null ? request.getTimeLimit() : 20) : null)
                .timerEnabled(timerEnabled)
                .attemptsAllowed(attemptLimitEnabled ? (request.getAttemptsAllowed() != null ? request.getAttemptsAllowed() : 1) : null)
                .attemptLimitEnabled(attemptLimitEnabled)
                .attemptScorePolicy(request.getAttemptScorePolicy() != null ? request.getAttemptScorePolicy() : AttemptScorePolicy.HIGHEST)
                .secureSessionEnabled(request.getSecureSessionEnabled() != null ? request.getSecureSessionEnabled() : false)
                .secureRequireFullscreen(request.getSecureRequireFullscreen() != null ? request.getSecureRequireFullscreen() : true)
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

        applyInlineQuizUpdates(quiz, updates);

        Quiz updatedQuiz = quizRepository.save(quiz);
        return mapAndEnrich(updatedQuiz);
    }

    /**
     * Duplicate a quiz and optionally move it to another course.
     * When duplicated across courses, questions are deep-cloned into the target course.
     */
    @Transactional
    @CacheEvict(value = "quizzes", allEntries = true)
    public QuizDto duplicateQuiz(
        UUID id, UUID userId, String userRole, UUID targetCourseId, boolean deepCloneQuestions) {
        Quiz original = findQuizById(id);
        ensureCanManageCourse(original.getCourseId(), userId, userRole);

        UUID resolvedTargetCourseId = targetCourseId != null ? targetCourseId : original.getCourseId();
        ensureCanManageCourse(resolvedTargetCourseId, userId, userRole);

        boolean cloneQuestions =
            deepCloneQuestions || !original.getCourseId().equals(resolvedTargetCourseId);

        Quiz copy =
            Quiz.builder()
                .courseId(resolvedTargetCourseId)
                .title(buildCopyTitle(original.getTitle()))
                .description(original.getDescription())
                .timeLimit(original.getTimeLimit())
                .timerEnabled(original.getTimerEnabled())
                .attemptsAllowed(original.getAttemptsAllowed())
                .attemptLimitEnabled(original.getAttemptLimitEnabled())
                .attemptScorePolicy(original.getAttemptScorePolicy())
                .secureSessionEnabled(original.getSecureSessionEnabled())
                .secureRequireFullscreen(original.getSecureRequireFullscreen())
                .shuffleQuestions(original.getShuffleQuestions())
                .shuffleAnswers(original.getShuffleAnswers())
                .showCorrectAnswers(original.getShowCorrectAnswers())
                .showCorrectAnswersAt(original.getShowCorrectAnswersAt())
                .passPercentage(original.getPassPercentage())
                .createdBy(userId)
                .quizQuestions(new java.util.HashSet<>())
                .sections(new ArrayList<>())
                .build();

        Map<UUID, QuestionBank> clonedQuestions = new LinkedHashMap<>();
        List<QuizQuestion> quizQuestions =
            original.getQuizQuestions().stream()
                .sorted(java.util.Comparator.comparingInt(QuizQuestion::getPosition))
                .toList();
        for (QuizQuestion originalQuestion : quizQuestions) {
            QuestionBank resolvedQuestion =
                cloneQuestions
                    ? clonedQuestions.computeIfAbsent(
                        originalQuestion.getQuestion().getId(),
                        ignored -> cloneQuestion(originalQuestion.getQuestion(), resolvedTargetCourseId, userId))
                    : originalQuestion.getQuestion();

            QuizQuestion copyQuestion =
                QuizQuestion.builder()
                    .quiz(copy)
                    .question(resolvedQuestion)
                    .position(originalQuestion.getPosition())
                    .pointsOverride(originalQuestion.getPointsOverride())
                    .build();
            copy.getQuizQuestions().add(copyQuestion);
        }

        List<QuizSection> sectionCopies = new ArrayList<>();
        for (QuizSection section : original.getSections()) {
            QuizSection sectionCopy =
                QuizSection.builder()
                    .quiz(copy)
                    .title(section.getTitle())
                    .position(section.getPosition())
                    .questionCount(section.getQuestionCount())
                    .rules(new ArrayList<>())
                    .build();

            List<QuizSectionRule> ruleCopies = new ArrayList<>();
            for (QuizSectionRule rule : section.getRules()) {
                QuizSectionRule ruleCopy =
                    QuizSectionRule.builder()
                        .section(sectionCopy)
                        .questionType(rule.getQuestionType())
                        .difficulty(rule.getDifficulty())
                        .tag(rule.getTag())
                        .quota(rule.getQuota())
                        .build();
                ruleCopies.add(ruleCopy);
            }
            sectionCopy.setRules(ruleCopies);
            sectionCopies.add(sectionCopy);
        }
        copy.setSections(sectionCopies);

        Quiz savedCopy = quizRepository.save(copy);
        return mapAndEnrich(savedCopy);
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
        if (updates.getTimerEnabled() != null) {
            quiz.setTimerEnabled(updates.getTimerEnabled());
            if (!updates.getTimerEnabled()) {
                quiz.setTimeLimit(null);
            }
        }
        if (updates.getTimeLimit() != null && Boolean.TRUE.equals(quiz.getTimerEnabled())) {
            quiz.setTimeLimit(updates.getTimeLimit());
        }
        if (updates.getTimeLimit() != null && updates.getTimerEnabled() == null) {
            quiz.setTimerEnabled(true);
            quiz.setTimeLimit(updates.getTimeLimit());
        }
        if (updates.getAttemptLimitEnabled() != null) {
            quiz.setAttemptLimitEnabled(updates.getAttemptLimitEnabled());
            if (!updates.getAttemptLimitEnabled()) {
                quiz.setAttemptsAllowed(null);
            }
        }
        if (updates.getAttemptsAllowed() != null && Boolean.TRUE.equals(quiz.getAttemptLimitEnabled())) {
            quiz.setAttemptsAllowed(updates.getAttemptsAllowed());
        }
        if (updates.getAttemptsAllowed() != null && updates.getAttemptLimitEnabled() == null) {
            quiz.setAttemptLimitEnabled(true);
            quiz.setAttemptsAllowed(updates.getAttemptsAllowed());
        }
        if (updates.getAttemptScorePolicy() != null) quiz.setAttemptScorePolicy(updates.getAttemptScorePolicy());
        if (updates.getSecureSessionEnabled() != null) quiz.setSecureSessionEnabled(updates.getSecureSessionEnabled());
        if (updates.getSecureRequireFullscreen() != null) quiz.setSecureRequireFullscreen(updates.getSecureRequireFullscreen());
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

    /**
     * Replace quiz questions from inline authoring payload.
     */
    @Transactional
    @CacheEvict(value = "quizzes", key = "#quizId")
    public QuizDto replaceQuizQuestionsFromInline(
        UUID quizId, List<InlineQuizQuestionRequest> questions, UUID userId) {
        Quiz quiz = findQuizById(quizId);
        if (!hasQuizAccess(quiz, userId)) {
            throw new ValidationException("You don't have permission to modify this quiz");
        }

        quiz.getQuizQuestions().clear();
        quizRepository.save(quiz);

        if (questions == null || questions.isEmpty()) {
            return mapAndEnrich(quiz);
        }

        int position = 0;
        for (InlineQuizQuestionRequest inline : questions) {
            if (inline.getQuestionType() == null || inline.getQuestionType().isBlank()) {
                throw new ValidationException("Inline quiz question type is required");
            }
            if (inline.getStem() == null || inline.getStem().isBlank()) {
                throw new ValidationException("Inline quiz question stem is required");
            }

            Map<String, Object> metadata = inline.getMetadata() == null
                ? new HashMap<>()
                : new HashMap<>(inline.getMetadata());
            if (inline.getPromptDocument() != null && !inline.getPromptDocument().isEmpty()) {
                metadata.put("promptDocument", inline.getPromptDocument());
            }

            QuestionBank question = QuestionBank.builder()
                .courseId(quiz.getCourseId())
                .questionType(inline.getQuestionType().trim().toUpperCase())
                .stem(inline.getStem())
                .options(inline.getOptions() == null ? Map.of() : new HashMap<>(inline.getOptions()))
                .correctAnswer(inline.getCorrectAnswer() == null ? Map.of() : new HashMap<>(inline.getCorrectAnswer()))
                .explanation(inline.getExplanation())
                .points(inline.getPoints())
                .metadata(metadata)
                .createdBy(userId)
                .build();

            QuestionBank savedQuestion = questionBankRepository.save(question);
            questionVersionService.createVersionFromQuestion(savedQuestion, userId);

            QuizQuestion quizQuestion = QuizQuestion.builder()
                .quiz(quiz)
                .question(savedQuestion)
                .position(position++)
                .build();
            quiz.getQuizQuestions().add(quizQuestion);
        }

        Quiz saved = quizRepository.save(quiz);
        return mapAndEnrich(saved);
    }

    // Helper methods

    private void applyInlineQuizUpdates(Quiz quiz, InlineQuizRequest updates) {
        if (updates.getTitle() != null && !updates.getTitle().isBlank()) quiz.setTitle(updates.getTitle());
        if (updates.getDescription() != null) quiz.setDescription(updates.getDescription());
        if (updates.getTimerEnabled() != null) {
            quiz.setTimerEnabled(updates.getTimerEnabled());
            if (!updates.getTimerEnabled()) {
                quiz.setTimeLimit(null);
            }
        }
        if (updates.getTimeLimit() != null && Boolean.TRUE.equals(quiz.getTimerEnabled())) {
            quiz.setTimeLimit(updates.getTimeLimit());
        }
        if (updates.getTimeLimit() != null && updates.getTimerEnabled() == null) {
            quiz.setTimerEnabled(true);
            quiz.setTimeLimit(updates.getTimeLimit());
        }
        if (updates.getAttemptLimitEnabled() != null) {
            quiz.setAttemptLimitEnabled(updates.getAttemptLimitEnabled());
            if (!updates.getAttemptLimitEnabled()) {
                quiz.setAttemptsAllowed(null);
            }
        }
        if (updates.getAttemptsAllowed() != null && Boolean.TRUE.equals(quiz.getAttemptLimitEnabled())) {
            quiz.setAttemptsAllowed(updates.getAttemptsAllowed());
        }
        if (updates.getAttemptsAllowed() != null && updates.getAttemptLimitEnabled() == null) {
            quiz.setAttemptLimitEnabled(true);
            quiz.setAttemptsAllowed(updates.getAttemptsAllowed());
        }
        if (updates.getAttemptScorePolicy() != null) quiz.setAttemptScorePolicy(updates.getAttemptScorePolicy());
        if (updates.getSecureSessionEnabled() != null) quiz.setSecureSessionEnabled(updates.getSecureSessionEnabled());
        if (updates.getSecureRequireFullscreen() != null) quiz.setSecureRequireFullscreen(updates.getSecureRequireFullscreen());
        if (updates.getShuffleQuestions() != null) quiz.setShuffleQuestions(updates.getShuffleQuestions());
        if (updates.getShuffleAnswers() != null) quiz.setShuffleAnswers(updates.getShuffleAnswers());
        if (updates.getShowCorrectAnswers() != null) quiz.setShowCorrectAnswers(updates.getShowCorrectAnswers());
        if (updates.getShowCorrectAnswersAt() != null) quiz.setShowCorrectAnswersAt(updates.getShowCorrectAnswersAt());
        if (updates.getPassPercentage() != null) quiz.setPassPercentage(updates.getPassPercentage());
    }

    private Quiz findQuizById(UUID id) {
        return quizRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz", "id", id));
    }

    private QuestionBank findQuestionById(UUID id) {
        return questionBankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", id));
    }

    private QuestionBank cloneQuestion(QuestionBank original, UUID targetCourseId, UUID userId) {
        QuestionBank clone =
            QuestionBank.builder()
                .courseId(targetCourseId)
                .questionType(original.getQuestionType())
                .topic(original.getTopic())
                .difficulty(original.getDifficulty())
                .stem(original.getStem())
                .options(copyMap(original.getOptions()))
                .correctAnswer(copyMap(original.getCorrectAnswer()))
                .explanation(original.getExplanation())
                .points(original.getPoints())
                .metadata(copyMap(original.getMetadata()))
                .tags(copyStringList(original.getTags()))
                .isArchived(false)
                .createdBy(userId)
                .build();
        QuestionBank saved = questionBankRepository.save(clone);
        questionVersionService.createVersionFromQuestion(saved, userId);
        return saved;
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

    private void ensureCanManageCourse(UUID courseId, UUID userId, String userRole) {
        Course course = courseRepository
            .findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
        if (isSuperAdmin(userRole)
            || course.getOwnerId().equals(userId)
            || courseMemberRepository.canUserManageCourse(courseId, userId)) {
            return;
        }
        throw new ValidationException("You don't have permission to duplicate quizzes in this course");
    }

    private boolean isSuperAdmin(String userRole) {
        return "SUPERADMIN".equalsIgnoreCase(userRole);
    }

    private String buildCopyTitle(String originalTitle) {
        if (originalTitle == null || originalTitle.isBlank()) {
            return "Untitled quiz (Copy)";
        }
        return originalTitle + " (Copy)";
    }

    private Map<String, Object> copyMap(Map<String, Object> source) {
        return source == null ? new HashMap<>() : new HashMap<>(source);
    }

    private List<String> copyStringList(List<String> source) {
        return source == null ? new ArrayList<>() : new ArrayList<>(source);
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
