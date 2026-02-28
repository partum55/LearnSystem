package com.university.lms.course.assessment.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.course.assessment.domain.QuestionBank;
import com.university.lms.course.assessment.domain.QuestionVersion;
import com.university.lms.course.assessment.dto.CreateQuestionVersionRequest;
import com.university.lms.course.assessment.dto.QuestionVersionDto;
import com.university.lms.course.assessment.repository.QuestionBankRepository;
import com.university.lms.course.assessment.repository.QuestionVersionRepository;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Handles immutable version snapshots for question bank entries. */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionVersionService {

  private final QuestionVersionRepository questionVersionRepository;
  private final QuestionBankRepository questionBankRepository;

  public List<QuestionVersionDto> listVersions(UUID questionId) {
    return questionVersionRepository.findByQuestionIdOrderByVersionNumberDesc(questionId).stream()
        .map(this::toDto)
        .toList();
  }

  public QuestionVersionDto getLatestVersionDto(UUID questionId) {
    QuestionVersion version = ensureLatestVersion(questionId, null);
    return toDto(version);
  }

  @Transactional
  public QuestionVersion createVersionFromQuestion(QuestionBank question, UUID createdBy) {
    int nextVersion = questionVersionRepository.findMaxVersionNumber(question.getId()) + 1;

    Map<String, Object> promptDoc = toPromptDoc(question.getStem());
    Map<String, Object> payload = new HashMap<>();
    payload.put("questionType", question.getQuestionType());
    payload.put("topic", question.getTopic());
    payload.put("difficulty", question.getDifficulty());
    payload.put("tags", question.getTags() == null ? List.of() : question.getTags());
    payload.put("options", question.getOptions() == null ? Map.of() : question.getOptions());
    payload.put("explanation", question.getExplanation());
    payload.put("points", question.getPoints());

    Map<String, Object> answerKey = question.getCorrectAnswer() == null ? Map.of() : question.getCorrectAnswer();

    QuestionVersion version =
        QuestionVersion.builder()
            .question(question)
            .versionNumber(nextVersion)
            .promptDocJson(promptDoc)
            .payloadJson(payload)
            .answerKeyJson(answerKey)
            .createdBy(createdBy)
            .build();

    return questionVersionRepository.save(version);
  }

  @Transactional
  public QuestionVersionDto createExplicitVersion(
      UUID questionId, CreateQuestionVersionRequest request, UUID createdBy) {
    QuestionBank question =
        questionBankRepository
            .findById(questionId)
            .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));

    int nextVersion = questionVersionRepository.findMaxVersionNumber(questionId) + 1;

    QuestionVersion version =
        QuestionVersion.builder()
            .question(question)
            .versionNumber(nextVersion)
            .promptDocJson(request.getPromptDocJson())
            .payloadJson(request.getPayloadJson() == null ? Map.of() : request.getPayloadJson())
            .answerKeyJson(request.getAnswerKeyJson() == null ? Map.of() : request.getAnswerKeyJson())
            .createdBy(createdBy)
            .build();

    return toDto(questionVersionRepository.save(version));
  }

  @Transactional
  public QuestionVersion ensureLatestVersion(UUID questionId, UUID fallbackCreatedBy) {
    Optional<QuestionVersion> existing =
        questionVersionRepository.findFirstByQuestionIdOrderByVersionNumberDesc(questionId);
    if (existing.isPresent()) {
      return existing.get();
    }

    QuestionBank question =
        questionBankRepository
            .findById(questionId)
            .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));

    UUID actor = fallbackCreatedBy != null ? fallbackCreatedBy : question.getCreatedBy();
    log.info("Creating initial version snapshot for question {}", questionId);
    return createVersionFromQuestion(question, actor);
  }

  public QuestionVersionDto toDto(QuestionVersion version) {
    return QuestionVersionDto.builder()
        .id(version.getId())
        .questionId(version.getQuestion().getId())
        .versionNumber(version.getVersionNumber())
        .promptDocJson(version.getPromptDocJson())
        .payloadJson(version.getPayloadJson())
        .answerKeyJson(version.getAnswerKeyJson())
        .createdBy(version.getCreatedBy())
        .createdAt(version.getCreatedAt())
        .build();
  }

  private Map<String, Object> toPromptDoc(String stem) {
    Map<String, Object> textNode = new HashMap<>();
    textNode.put("type", "text");
    textNode.put("text", stem == null ? "" : stem);

    Map<String, Object> paragraphNode = new HashMap<>();
    paragraphNode.put("type", "paragraph");
    paragraphNode.put("content", List.of(textNode));

    Map<String, Object> root = new HashMap<>();
    root.put("version", 1);
    root.put("type", "doc");
    root.put("content", List.of(paragraphNode));
    return root;
  }
}
