package com.university.lms.course.assessment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.assessment.domain.Quiz;
import com.university.lms.course.assessment.dto.*;
import com.university.lms.course.assessment.repository.QuizRepository;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Handles JSON/CSV quiz import-export for MVP interoperability. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizImportExportService {

  private final QuizRepository quizRepository;
  private final QuestionService questionService;
  private final QuizService quizService;
  private final QuizSectionService quizSectionService;
  private final QuestionVersionService questionVersionService;
  private final ObjectMapper objectMapper;

  public Map<String, Object> exportQuizAsJson(UUID quizId) {
    Quiz quiz =
        quizRepository
            .findById(quizId)
            .orElseThrow(() -> new ResourceNotFoundException("Quiz", "id", quizId));

    List<Map<String, Object>> questions =
        quiz.getQuizQuestions().stream()
            .sorted(Comparator.comparingInt(q -> q.getPosition() == null ? 0 : q.getPosition()))
            .map(
                qq -> {
                  QuestionDto question = questionService.getQuestionById(qq.getQuestion().getId());
                  QuestionVersionDto version = questionVersionService.getLatestVersionDto(question.getId());
                  Map<String, Object> item = new LinkedHashMap<>();
                  item.put("question", question);
                  item.put("version", version);
                  item.put("pointsOverride", qq.getPointsOverride());
                  item.put("position", qq.getPosition());
                  return item;
                })
            .toList();

    Map<String, Object> output = new LinkedHashMap<>();
    output.put("quiz", quizService.getQuizById(quizId));
    output.put("sections", quizSectionService.getSections(quizId, quiz.getCreatedBy()));
    output.put("questions", questions);
    return output;
  }

  public String exportQuizAsCsv(UUID quizId) {
    Quiz quiz =
        quizRepository
            .findById(quizId)
            .orElseThrow(() -> new ResourceNotFoundException("Quiz", "id", quizId));

    StringBuilder csv = new StringBuilder();
    csv.append("question_type,stem,points,correct_answer_json,options_json,topic,difficulty,tags_json\n");

    quiz.getQuizQuestions().stream()
        .sorted(Comparator.comparingInt(q -> q.getPosition() == null ? 0 : q.getPosition()))
        .forEach(
            qq -> {
              QuestionDto question = questionService.getQuestionById(qq.getQuestion().getId());
              csv.append(csvCell(question.getQuestionType())).append(',');
              csv.append(csvCell(question.getStem())).append(',');
              csv.append(csvCell(String.valueOf(question.getPoints()))).append(',');
              csv.append(csvCell(toJson(question.getCorrectAnswer()))).append(',');
              csv.append(csvCell(toJson(question.getOptions()))).append(',');
              csv.append(csvCell(question.getTopic())).append(',');
              csv.append(csvCell(question.getDifficulty())).append(',');
              csv.append(csvCell(toJson(question.getTags()))).append('\n');
            });

    return csv.toString();
  }

  @Transactional
  public QuizDto importFromJson(QuizImportRequest request, UUID createdBy) {
    QuizDto quiz = quizService.createQuiz(request.getCourseId(), request.getTitle(), request.getDescription(), createdBy);

    QuizDto updates = QuizDto.builder()
        .timeLimit(request.getTimeLimit())
        .attemptsAllowed(request.getAttemptsAllowed())
        .shuffleQuestions(request.getShuffleQuestions())
        .shuffleAnswers(request.getShuffleAnswers())
        .build();
    quiz = quizService.updateQuiz(quiz.getId(), updates, createdBy);

    int position = 0;
    for (QuestionDto question : request.getQuestions()) {
      if (question.getPoints() == null) {
        question.setPoints(BigDecimal.ONE);
      }
      question.setCourseId(request.getCourseId());
      QuestionDto created = questionService.createQuestion(question, createdBy);
      quizService.addQuestionToQuiz(quiz.getId(), created.getId(), position++, null, createdBy);
    }

    if (request.getSections() != null) {
      for (UpsertQuizSectionRequest section : request.getSections()) {
        quizSectionService.createSection(quiz.getId(), section, createdBy);
      }
    }

    return quizService.getQuizById(quiz.getId());
  }

  @Transactional
  public QuizDto importFromCsv(UUID courseId, String title, MultipartFile file, UUID createdBy) {
    String csv;
    try (InputStream inputStream = file.getInputStream()) {
      csv = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
    } catch (IOException ex) {
      throw new ValidationException("Failed to read CSV file");
    }

    QuizImportRequest request = QuizImportRequest.builder().courseId(courseId).title(title).build();

    String[] lines = csv.split("\\R");
    for (int i = 1; i < lines.length; i++) {
      String line = lines[i].trim();
      if (line.isEmpty()) {
        continue;
      }

      String[] values = splitCsv(line);
      if (values.length < 8) {
        continue;
      }

      QuestionDto question = new QuestionDto();
      question.setQuestionType(unquote(values[0]));
      question.setStem(unquote(values[1]));
      question.setPoints(parseBigDecimal(unquote(values[2]), BigDecimal.ONE));
      question.setCorrectAnswer(parseJsonMap(unquote(values[3])));
      question.setOptions(parseJsonMap(unquote(values[4])));
      question.setTopic(unquote(values[5]));
      question.setDifficulty(unquote(values[6]));
      question.setTags(parseJsonList(unquote(values[7])));
      request.getQuestions().add(question);
    }

    return importFromJson(request, createdBy);
  }

  private String[] splitCsv(String line) {
    return line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
  }

  private String csvCell(String value) {
    if (value == null) {
      return "\"\"";
    }
    String escaped = value.replace("\"", "\"\"");
    return '"' + escaped + '"';
  }

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value == null ? Map.of() : value);
    } catch (JsonProcessingException ex) {
      return "{}";
    }
  }

  private String unquote(String value) {
    if (value == null) {
      return "";
    }
    String trimmed = value.trim();
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() >= 2) {
      trimmed = trimmed.substring(1, trimmed.length() - 1);
    }
    return trimmed.replace("\"\"", "\"");
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> parseJsonMap(String json) {
    if (json == null || json.isBlank()) {
      return Map.of();
    }
    try {
      return objectMapper.readValue(json, Map.class);
    } catch (Exception ex) {
      return Map.of();
    }
  }

  @SuppressWarnings("unchecked")
  private List<String> parseJsonList(String json) {
    if (json == null || json.isBlank()) {
      return List.of();
    }
    try {
      return objectMapper.readValue(json, List.class);
    } catch (Exception ex) {
      return List.of();
    }
  }

  private BigDecimal parseBigDecimal(String value, BigDecimal fallback) {
    try {
      return new BigDecimal(value);
    } catch (Exception ex) {
      return fallback;
    }
  }
}
