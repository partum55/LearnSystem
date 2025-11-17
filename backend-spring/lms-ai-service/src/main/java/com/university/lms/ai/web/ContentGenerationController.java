package com.university.lms.ai.web;

import com.university.lms.ai.dto.*;
import com.university.lms.ai.service.ContentGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for AI content generation
 */
@RestController
@RequestMapping("/api/ai/generate")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ContentGenerationController {

    private final ContentGenerationService contentGenerationService;

    /**
     * Generate a quiz using AI
     */
    @PostMapping("/quiz")
    public ResponseEntity<GeneratedQuizResponse> generateQuiz(
            @RequestBody QuizGenerationRequest request) {
        log.info("Received quiz generation request for topic: {}", request.getTopic());
        
        // Set defaults
        if (request.getLanguage() == null) request.setLanguage("en");
        if (request.getQuestionCount() == null) request.setQuestionCount(10);
        if (request.getDifficulty() == null) request.setDifficulty("medium");
        
        GeneratedQuizResponse response = contentGenerationService.generateQuiz(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Generate an assignment using AI
     */
    @PostMapping("/assignment")
    public ResponseEntity<GeneratedAssignmentResponse> generateAssignment(
            @RequestBody AssignmentGenerationRequest request) {
        log.info("Received assignment generation request for topic: {}", request.getTopic());
        
        // Set defaults
        if (request.getLanguage() == null) request.setLanguage("en");
        if (request.getAssignmentType() == null) request.setAssignmentType("FILE_UPLOAD");
        if (request.getDifficulty() == null) request.setDifficulty("medium");
        if (request.getMaxPoints() == null) request.setMaxPoints(100);
        if (request.getIncludeRubric() == null) request.setIncludeRubric(true);
        
        GeneratedAssignmentResponse response = contentGenerationService.generateAssignment(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Generate a course module using AI
     */
    @PostMapping("/module")
    public ResponseEntity<GeneratedModuleResponse> generateModule(
            @RequestBody ModuleGenerationRequest request) {
        log.info("Received module generation request for topic: {}", request.getTopic());
        
        // Set defaults
        if (request.getLanguage() == null) request.setLanguage("en");
        if (request.getWeekDuration() == null) request.setWeekDuration(4);
        if (request.getDifficulty() == null) request.setDifficulty("intermediate");
        if (request.getIncludeLearningObjectives() == null) request.setIncludeLearningObjectives(true);
        if (request.getIncludeReadingMaterials() == null) request.setIncludeReadingMaterials(true);
        if (request.getIncludeActivities() == null) request.setIncludeActivities(true);
        
        GeneratedModuleResponse response = contentGenerationService.generateModule(request);
        return ResponseEntity.ok(response);
    }
}
