package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.dto.GeneratedCourseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;

/**
 * Service for persisting AI-generated content to the database
 * via Course and Assessment services
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CoursePersistenceService {

    private final ObjectMapper objectMapper;

    @Value("${services.course-service.url:http://localhost:8081}")
    private String courseServiceUrl;

    @Value("${services.assessment-service.url:http://localhost:8083}")
    private String assessmentServiceUrl;

    private final WebClient.Builder webClientBuilder;

    /**
     * Save generated course with all modules, assignments, and quizzes
     */
    public Map<String, Object> saveGeneratedCourse(GeneratedCourseResponse response, UUID ownerId, String authToken) {
        log.info("Saving generated course to database");

        try {
            // 1. Create the course
            Map<String, Object> courseData = buildCourseData(response.getCourse(), ownerId);
            Map<String, Object> savedCourse = createCourse(courseData, authToken);
            UUID courseId = UUID.fromString(savedCourse.get("id").toString());

            log.info("Created course with ID: {}", courseId);

            List<Map<String, Object>> savedModules = new ArrayList<>();

            // 2. Create modules with assignments and quizzes
            if (response.getModules() != null) {
                for (GeneratedCourseResponse.ModuleData moduleData : response.getModules()) {
                    Map<String, Object> savedModule = createModule(courseId, moduleData, authToken);
                    UUID moduleId = UUID.fromString(savedModule.get("id").toString());

                    log.info("Created module with ID: {}", moduleId);

                    // 3. Create assignments for this module
                    if (moduleData.getAssignments() != null) {
                        for (GeneratedCourseResponse.AssignmentData assignmentData : moduleData.getAssignments()) {
                            createAssignment(courseId, moduleId, assignmentData, authToken);
                        }
                    }

                    // 4. Create quizzes for this module
                    if (moduleData.getQuizzes() != null) {
                        for (GeneratedCourseResponse.QuizData quizData : moduleData.getQuizzes()) {
                            createQuiz(courseId, quizData, ownerId, authToken);
                        }
                    }

                    savedModules.add(savedModule);
                }
            }

            return Map.of(
                "course", savedCourse,
                "modules", savedModules,
                "message", "Course successfully created with all content"
            );

        } catch (Exception e) {
            log.error("Error saving generated course", e);
            throw new RuntimeException("Failed to save generated course: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> buildCourseData(GeneratedCourseResponse.CourseData courseData, UUID ownerId) {
        Map<String, Object> data = new HashMap<>();
        data.put("code", courseData.getCode());
        data.put("titleUk", courseData.getTitleUk());
        data.put("titleEn", courseData.getTitleEn());
        data.put("descriptionUk", courseData.getDescriptionUk());
        data.put("descriptionEn", courseData.getDescriptionEn());
        data.put("syllabus", courseData.getSyllabus());
        data.put("ownerId", ownerId.toString());
        data.put("visibility", "DRAFT");
        data.put("status", "DRAFT");
        data.put("isPublished", false);

        if (courseData.getStartDate() != null) {
            data.put("startDate", courseData.getStartDate().toString());
        }
        if (courseData.getEndDate() != null) {
            data.put("endDate", courseData.getEndDate().toString());
        }
        if (courseData.getAcademicYear() != null) {
            data.put("academicYear", courseData.getAcademicYear());
        }
        if (courseData.getMaxStudents() != null) {
            data.put("maxStudents", courseData.getMaxStudents());
        }

        return data;
    }

    private Map<String, Object> createCourse(Map<String, Object> courseData, String authToken) {
        WebClient webClient = webClientBuilder.baseUrl(courseServiceUrl + "/api").build();

        return webClient.post()
                .uri("/courses")
                .header("Authorization", authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(courseData)
                .retrieve()
                .onStatus(status -> status.value() != HttpStatus.CREATED.value(),
                        clientResponse -> Mono.error(new RuntimeException("Failed to create course")))
                .bodyToMono(Map.class)
                .block();
    }

    private Map<String, Object> createModule(UUID courseId, GeneratedCourseResponse.ModuleData moduleData, String authToken) {
        Map<String, Object> data = new HashMap<>();
        data.put("courseId", courseId.toString());
        data.put("title", moduleData.getTitle());
        data.put("description", moduleData.getDescription());
        data.put("position", moduleData.getPosition());
        data.put("isPublished", false);

        WebClient webClient = webClientBuilder.baseUrl(courseServiceUrl + "/api").build();

        return webClient.post()
                .uri("/courses/{courseId}/modules", courseId)
                .header("Authorization", authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(data)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    private void createAssignment(UUID courseId, UUID moduleId,
                                   GeneratedCourseResponse.AssignmentData assignmentData, String authToken) {
        Map<String, Object> data = new HashMap<>();
        data.put("courseId", courseId.toString());
        data.put("moduleId", moduleId.toString());
        data.put("title", assignmentData.getTitle());
        data.put("description", assignmentData.getDescription());
        data.put("assignmentType", assignmentData.getAssignmentType());
        data.put("instructions", assignmentData.getInstructions());
        data.put("position", assignmentData.getPosition());
        data.put("isPublished", false);

        if (assignmentData.getMaxPoints() != null) {
            data.put("maxPoints", assignmentData.getMaxPoints());
        }
        if (assignmentData.getTimeLimit() != null) {
            data.put("timeLimit", assignmentData.getTimeLimit());
        }

        WebClient webClient = webClientBuilder.baseUrl(assessmentServiceUrl + "/api").build();

        webClient.post()
                .uri("/assignments")
                .header("Authorization", authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(data)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        log.info("Created assignment: {}", assignmentData.getTitle());
    }

    private void createQuiz(UUID courseId, GeneratedCourseResponse.QuizData quizData,
                            UUID createdBy, String authToken) {
        Map<String, Object> data = new HashMap<>();
        data.put("courseId", courseId.toString());
        data.put("title", quizData.getTitle());
        data.put("description", quizData.getDescription());
        data.put("createdBy", createdBy.toString());

        if (quizData.getTimeLimit() != null) {
            data.put("timeLimit", quizData.getTimeLimit());
        }
        if (quizData.getAttemptsAllowed() != null) {
            data.put("attemptsAllowed", quizData.getAttemptsAllowed());
        }
        if (quizData.getShuffleQuestions() != null) {
            data.put("shuffleQuestions", quizData.getShuffleQuestions());
        }

        WebClient webClient = webClientBuilder.baseUrl(assessmentServiceUrl + "/api").build();

        Map<String, Object> savedQuiz = webClient.post()
                .uri("/quizzes")
                .header("Authorization", authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(data)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        UUID quizId = UUID.fromString(savedQuiz.get("id").toString());
        log.info("Created quiz with ID: {}", quizId);

        // Create questions for the quiz
        if (quizData.getQuestions() != null) {
            for (GeneratedCourseResponse.QuestionData questionData : quizData.getQuestions()) {
                createQuizQuestion(quizId, questionData, authToken);
            }
        }
    }

    private void createQuizQuestion(UUID quizId, GeneratedCourseResponse.QuestionData questionData, String authToken) {
        Map<String, Object> data = new HashMap<>();
        data.put("quizId", quizId.toString());
        data.put("questionText", questionData.getQuestionText());
        data.put("questionType", questionData.getQuestionType());
        data.put("points", questionData.getPoints());

        // Convert answer options to the format expected by the API
        if (questionData.getAnswerOptions() != null) {
            List<Map<String, Object>> options = new ArrayList<>();
            for (GeneratedCourseResponse.AnswerOptionData option : questionData.getAnswerOptions()) {
                Map<String, Object> optionData = new HashMap<>();
                optionData.put("text", option.getText());
                optionData.put("isCorrect", option.getIsCorrect());
                optionData.put("feedback", option.getFeedback());
                options.add(optionData);
            }
            data.put("answerOptions", options);
        }

        WebClient webClient = webClientBuilder.baseUrl(assessmentServiceUrl + "/api").build();

        webClient.post()
                .uri("/quiz-questions")
                .header("Authorization", authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(data)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        log.debug("Created quiz question: {}", questionData.getQuestionText());
    }
}

