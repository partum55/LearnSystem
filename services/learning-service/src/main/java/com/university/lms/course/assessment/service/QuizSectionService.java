package com.university.lms.course.assessment.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.domain.QuizSection;
import com.university.lms.course.assessment.domain.QuizSectionRule;
import com.university.lms.course.assessment.dto.QuizSectionDto;
import com.university.lms.course.assessment.dto.QuizSectionRuleDto;
import com.university.lms.course.assessment.dto.UpsertQuizSectionRequest;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.assessment.repository.QuizRepository;
import com.university.lms.course.assessment.repository.QuizSectionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages quiz section/rule definitions for randomization quotas. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizSectionService {

  private final QuizSectionRepository quizSectionRepository;
  private final QuizRepository quizRepository;
  private final AssignmentRepository assignmentRepository;

  public List<QuizSectionDto> getSections(UUID quizId, UUID userId) {
    Quiz quiz = findQuiz(quizId);
    ensureQuizAccess(quiz, userId);
    return quizSectionRepository.findByQuizIdOrderByPositionAsc(quizId).stream().map(this::toDto).toList();
  }

  @Transactional
  public QuizSectionDto createSection(UUID quizId, UpsertQuizSectionRequest request, UUID userId) {
    Quiz quiz = findQuiz(quizId);
    ensureQuizAccess(quiz, userId);

    QuizSection section =
        QuizSection.builder()
            .quiz(quiz)
            .title(request.getTitle().trim())
            .position(request.getPosition())
            .questionCount(request.getQuestionCount())
            .build();

    section.getRules().clear();
    if (request.getRules() != null) {
      request.getRules().forEach(rule -> section.getRules().add(toEntity(section, rule)));
    }

    return toDto(quizSectionRepository.save(section));
  }

  @Transactional
  public QuizSectionDto updateSection(
      UUID quizId, UUID sectionId, UpsertQuizSectionRequest request, UUID userId) {
    Quiz quiz = findQuiz(quizId);
    ensureQuizAccess(quiz, userId);

    QuizSection section =
        quizSectionRepository
            .findById(sectionId)
            .orElseThrow(() -> new ResourceNotFoundException("QuizSection", "id", sectionId));

    if (!section.getQuiz().getId().equals(quizId)) {
      throw new ValidationException("Section does not belong to the specified quiz");
    }

    section.setTitle(request.getTitle().trim());
    section.setPosition(request.getPosition());
    section.setQuestionCount(request.getQuestionCount());
    section.getRules().clear();
    if (request.getRules() != null) {
      request.getRules().forEach(rule -> section.getRules().add(toEntity(section, rule)));
    }

    return toDto(quizSectionRepository.save(section));
  }

  @Transactional
  public void deleteSection(UUID quizId, UUID sectionId, UUID userId) {
    Quiz quiz = findQuiz(quizId);
    ensureQuizAccess(quiz, userId);

    QuizSection section =
        quizSectionRepository
            .findById(sectionId)
            .orElseThrow(() -> new ResourceNotFoundException("QuizSection", "id", sectionId));

    if (!section.getQuiz().getId().equals(quizId)) {
      throw new ValidationException("Section does not belong to the specified quiz");
    }

    quizSectionRepository.delete(section);
  }

  private Quiz findQuiz(UUID quizId) {
    return quizRepository
        .findById(quizId)
        .orElseThrow(() -> new ResourceNotFoundException("Quiz", "id", quizId));
  }

  private void ensureQuizAccess(Quiz quiz, UUID userId) {
    if (quiz.getCreatedBy().equals(userId)) {
      return;
    }

    boolean hasAssignmentAccess =
        assignmentRepository
            .findFirstByQuizId(quiz.getId())
            .map(assignment -> assignment.getCreatedBy().equals(userId))
            .orElse(false);

    if (!hasAssignmentAccess) {
      throw new ValidationException("You don't have permission to edit quiz sections");
    }
  }

  private QuizSectionDto toDto(QuizSection section) {
    return QuizSectionDto.builder()
        .id(section.getId())
        .quizId(section.getQuiz().getId())
        .title(section.getTitle())
        .position(section.getPosition())
        .questionCount(section.getQuestionCount())
        .rules(section.getRules().stream().map(this::toDto).toList())
        .build();
  }

  private QuizSectionRuleDto toDto(QuizSectionRule rule) {
    return QuizSectionRuleDto.builder()
        .id(rule.getId())
        .questionType(rule.getQuestionType())
        .difficulty(rule.getDifficulty())
        .tag(rule.getTag())
        .quota(rule.getQuota())
        .build();
  }

  private QuizSectionRule toEntity(QuizSection section, QuizSectionRuleDto dto) {
    return QuizSectionRule.builder()
        .section(section)
        .questionType(blankToNull(dto.getQuestionType()))
        .difficulty(blankToNull(dto.getDifficulty()))
        .tag(blankToNull(dto.getTag()))
        .quota(dto.getQuota() == null ? 1 : dto.getQuota())
        .build();
  }

  private String blankToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
