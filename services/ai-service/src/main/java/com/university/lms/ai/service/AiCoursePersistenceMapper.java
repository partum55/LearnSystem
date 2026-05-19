package com.university.lms.ai.service;

import com.university.lms.ai.dto.GeneratedCourseResponse;
import com.university.lms.ai.dto.persistence.AiAssignmentCreateRequest;
import com.university.lms.ai.dto.persistence.AiCourseCreateRequest;
import com.university.lms.ai.dto.persistence.AiModuleCreateRequest;
import com.university.lms.ai.dto.persistence.AiQuestionCreateRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class AiCoursePersistenceMapper {

  public AiCourseCreateRequest toCourseCreateRequest(
      GeneratedCourseResponse.CourseData courseData, UUID ownerId) {
    return AiCourseCreateRequest.builder()
        .code(courseData.getCode())
        .titleUk(courseData.getTitleUk())
        .titleEn(courseData.getTitleEn())
        .descriptionUk(courseData.getDescriptionUk())
        .descriptionEn(courseData.getDescriptionEn())
        .syllabus(courseData.getSyllabus())
        .ownerId(ownerId.toString())
        .visibility(
            courseData.getVisibility() != null ? courseData.getVisibility() : "PRIVATE")
        .status("DRAFT")
        .isPublished(Boolean.TRUE.equals(courseData.getIsPublished()) ? true : false)
        .maxStudents(courseData.getMaxStudents())
        .build();
  }

  public AiModuleCreateRequest toModuleCreateRequest(
      UUID courseId, GeneratedCourseResponse.ModuleData moduleData) {
    return AiModuleCreateRequest.builder()
        .courseId(courseId.toString())
        .title(moduleData.getTitle())
        .description(moduleData.getDescription())
        .position(moduleData.getPosition())
        .isPublished(Boolean.TRUE.equals(moduleData.getIsPublished()) ? true : false)
        .build();
  }

  public AiAssignmentCreateRequest toAssignmentCreateRequest(
      UUID courseId, UUID moduleId, GeneratedCourseResponse.AssignmentData assignmentData) {
    return AiAssignmentCreateRequest.builder()
        .courseId(courseId.toString())
        .moduleId(moduleId.toString())
        .title(assignmentData.getTitle())
        .description(assignmentData.getDescription())
        .assignmentType(assignmentData.getAssignmentType())
        .instructions(assignmentData.getInstructions())
        .isPublished(Boolean.TRUE.equals(assignmentData.getIsPublished()) ? true : false)
        .maxPoints(assignmentData.getMaxPoints())
        .build();
  }

  public AiQuestionCreateRequest toQuestionCreateRequest(
      UUID courseId, GeneratedCourseResponse.QuestionData questionData) {
    Map<String, Object> options = new HashMap<>();
    if (questionData.getOptions() != null) {
      options.put("choices", questionData.getOptions());
    }

    Map<String, Object> correctAnswer = new HashMap<>();
    if (questionData.getCorrectAnswer() != null) {
      correctAnswer.put("value", questionData.getCorrectAnswer());
    }

    return AiQuestionCreateRequest.builder()
        .courseId(courseId.toString())
        .questionType(questionData.getQuestionType())
        .stem(questionData.getStem())
        .options(options.isEmpty() ? null : options)
        .correctAnswer(correctAnswer.isEmpty() ? null : correctAnswer)
        .explanation(questionData.getExplanation())
        .points(questionData.getPoints())
        .build();
  }
}
