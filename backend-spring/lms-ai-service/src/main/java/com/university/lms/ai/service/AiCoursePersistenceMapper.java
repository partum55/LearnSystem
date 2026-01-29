package com.university.lms.ai.service;

import com.university.lms.ai.dto.GeneratedCourseResponse;
import com.university.lms.ai.dto.persistence.AiAssignmentCreateRequest;
import com.university.lms.ai.dto.persistence.AiCourseCreateRequest;
import com.university.lms.ai.dto.persistence.AiModuleCreateRequest;
import com.university.lms.ai.dto.persistence.AiQuestionCreateRequest;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class AiCoursePersistenceMapper {

    public AiCourseCreateRequest toCourseCreateRequest(GeneratedCourseResponse.CourseData courseData, UUID ownerId) {
        AiCourseCreateRequest request = AiCourseCreateRequest.builder()
            .code(courseData.getCode())
            .titleUk(courseData.getTitleUk())
            .titleEn(courseData.getTitleEn())
            .descriptionUk(courseData.getDescriptionUk())
            .descriptionEn(courseData.getDescriptionEn())
            .syllabus(courseData.getSyllabus())
            .ownerId(ownerId.toString())
            .visibility("DRAFT")
            .status("DRAFT")
            .isPublished(false)
            .academicYear(courseData.getAcademicYear())
            .maxStudents(courseData.getMaxStudents())
            .build();

        if (courseData.getStartDate() != null) {
            request.setStartDate(courseData.getStartDate().toString());
        }
        if (courseData.getEndDate() != null) {
            request.setEndDate(courseData.getEndDate().toString());
        }
        return request;
    }

    public AiModuleCreateRequest toModuleCreateRequest(UUID courseId, GeneratedCourseResponse.ModuleData moduleData) {
        return AiModuleCreateRequest.builder()
            .courseId(courseId.toString())
            .title(moduleData.getTitle())
            .description(moduleData.getDescription())
            .position(moduleData.getPosition())
            .isPublished(false)
            .build();
    }

    public AiAssignmentCreateRequest toAssignmentCreateRequest(UUID courseId, UUID moduleId,
                                                               GeneratedCourseResponse.AssignmentData assignmentData) {
        return AiAssignmentCreateRequest.builder()
            .courseId(courseId.toString())
            .moduleId(moduleId.toString())
            .title(assignmentData.getTitle())
            .description(assignmentData.getDescription())
            .assignmentType(assignmentData.getAssignmentType())
            .instructions(assignmentData.getInstructions())
            .position(assignmentData.getPosition())
            .isPublished(false)
            .maxPoints(assignmentData.getMaxPoints())
            .timeLimit(assignmentData.getTimeLimit())
            .build();
    }

    public AiQuestionCreateRequest toQuestionCreateRequest(UUID courseId,
                                                           GeneratedCourseResponse.QuestionData questionData) {
        Map<String, Object> options = new HashMap<>();
        if (questionData.getAnswerOptions() != null) {
            List<Map<String, Object>> answerOptions = questionData.getAnswerOptions().stream()
                .map(option -> Map.<String, Object>of(
                    "text", option.getText(),
                    "isCorrect", option.getIsCorrect(),
                    "feedback", option.getFeedback()
                ))
                .collect(Collectors.toList());
            options.put("answerOptions", answerOptions);
        }

        Map<String, Object> correctAnswer = new HashMap<>();
        if (questionData.getAnswerOptions() != null) {
            List<String> correctOptions = questionData.getAnswerOptions().stream()
                .filter(option -> Boolean.TRUE.equals(option.getIsCorrect()))
                .map(GeneratedCourseResponse.AnswerOptionData::getText)
                .collect(Collectors.toList());
            if (!correctOptions.isEmpty()) {
                correctAnswer.put("selected", correctOptions);
            }
        }

        return AiQuestionCreateRequest.builder()
            .courseId(courseId.toString())
            .questionType(questionData.getQuestionType())
            .stem(questionData.getQuestionText())
            .options(options.isEmpty() ? null : options)
            .correctAnswer(correctAnswer.isEmpty() ? null : correctAnswer)
            .points(questionData.getPoints())
            .build();
    }
}
