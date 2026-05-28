package com.university.lms.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.domain.generation.AiGeneration;
import com.university.lms.ai.domain.model.AiErrorCode;
import com.university.lms.ai.domain.model.AiGenerationStatus;
import com.university.lms.ai.domain.model.AiTaskType;
import com.university.lms.ai.exception.AiException;
import com.university.lms.ai.provider.GeminiProviderClient;
import com.university.lms.ai.repository.AiGenerationRepository;
import com.university.lms.ai.web.dto.AiTaskRequest;
import com.university.lms.ai.web.dto.AiTaskResponse;
import com.university.lms.ai.service.AiKeyResolution;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import java.util.stream.Collectors;

@Service
public class AiTaskService {

    private final AiProviderConfigService configService;
    private final UserAiSettingsService userAiSettingsService;
    private final AiGenerationRepository generationRepository;
    private final LearningServiceClient learningServiceClient;
    private final Map<AiTaskType, AiTaskHandler> handlers;
    private final ObjectMapper objectMapper;

    public AiTaskService(
            AiProviderConfigService configService,
            UserAiSettingsService userAiSettingsService,
            AiGenerationRepository generationRepository,
            LearningServiceClient learningServiceClient,
            List<AiTaskHandler> handlerList,
            ObjectMapper objectMapper) {
        this.configService = configService;
        this.userAiSettingsService = userAiSettingsService;
        this.generationRepository = generationRepository;
        this.learningServiceClient = learningServiceClient;
        this.handlers = handlerList.stream()
                .collect(Collectors.toMap(AiTaskHandler::getTaskType, h -> h));
        this.objectMapper = objectMapper;
    }

    public AiTaskResponse executeTask(AiTaskRequest request, UUID userId, String fallbackRole) {
        if (!configService.isAiFeaturesEnabled()) {
            throw new AiException(AiErrorCode.AI_FEATURES_DISABLED, "AI features are currently disabled");
        }

        // Determine user role from SecurityContext
        String role = resolveGlobalRole(fallbackRole);

        // Enforce permissions
        checkPermissions(request.type(), request.context(), userId, role);

        // Resolve API key
        AiKeyResolution keyResolution = userAiSettingsService.resolveKey(userId, role);
        if (keyResolution.keySource() == com.university.lms.ai.domain.AiKeySource.NONE || keyResolution.apiKey() == null) {
            throw new AiException(AiErrorCode.AI_KEY_REQUIRED, "An active AI API key is required");
        }

        AiTaskHandler handler = handlers.get(request.type());
        if (handler == null) {
            throw new AiException(AiErrorCode.AI_TASK_FAILED, "No handler configured for task type: " + request.type());
        }

        AiGeneration generation = new AiGeneration();
        generation.setUserId(userId);
        generation.setTaskType(request.type());
        generation.setStatus(AiGenerationStatus.PROCESSING);
        generation.setProvider(configService.getDefaultProvider().name());
        generation.setModel(configService.getGeminiModel());
        generation.setKeySource(keyResolution.keySource().name());
        
        try {
            generation.setInputJson(objectMapper.writeValueAsString(request.input()));
        } catch (Exception e) {
            generation.setInputJson("{}");
        }

        generation = generationRepository.save(generation);

        try {
            JsonNode output = handler.execute(request.context(), request.input(), userId, keyResolution.apiKey());
            
            generation.setStatus(AiGenerationStatus.COMPLETED);
            generation.setOutputJson(objectMapper.writeValueAsString(output));
            generation.setCompletedAt(Instant.now());
            generationRepository.save(generation);

            return new AiTaskResponse(
                    generation.getId(),
                    request.type(),
                    AiGenerationStatus.COMPLETED,
                    output,
                    null,
                    null
            );

        } catch (AiException e) {
            generation.setStatus(AiGenerationStatus.FAILED);
            generation.setErrorMessage(e.getMessage());
            generation.setCompletedAt(Instant.now());
            generationRepository.save(generation);
            throw e;
        } catch (Exception e) {
            generation.setStatus(AiGenerationStatus.FAILED);
            generation.setErrorMessage(e.getMessage());
            generation.setCompletedAt(Instant.now());
            generationRepository.save(generation);
            throw new AiException(AiErrorCode.AI_TASK_FAILED, "Internal error during task execution", e);
        }
    }

    private void checkPermissions(AiTaskType type, Map<String, Object> context, UUID userId, String globalRole) {
        if ("admin".equalsIgnoreCase(globalRole)) {
            return; // Admins can do anything
        }

        if (type == AiTaskType.GENERATE_COURSE) {
            if (!"teacher".equalsIgnoreCase(globalRole)) {
                throw new AiException(AiErrorCode.AI_PERMISSION_DENIED, "Only teachers and admins can generate courses");
            }
            return;
        }

        // For course-specific tasks, check course role
        UUID courseId = extractCourseId(context);
        if (courseId == null) {
            throw new AiException(AiErrorCode.AI_PERMISSION_DENIED, "Course context is required for this task");
        }

        String courseRole = learningServiceClient.getCourseRole(courseId, userId);
        if (courseRole == null) {
            throw new AiException(AiErrorCode.AI_PERMISSION_DENIED, "User has no role in this course");
        }
        courseRole = courseRole.toUpperCase();

        boolean isTeacherOrOwner = "OWNER".equals(courseRole) || "TEACHER".equals(courseRole);

        switch (type) {
            case GENERATE_RTE_MATERIAL:
            case GENERATE_ASSIGNMENT:
            case IMPROVE_ASSIGNMENT_INSTRUCTIONS:
                if (!isTeacherOrOwner) {
                    throw new AiException(AiErrorCode.AI_PERMISSION_DENIED, "Must be course owner or teacher");
                }
                break;
            case SUGGEST_GRADE:
                if (!isTeacherOrOwner && !"TA".equals(courseRole)) {
                    throw new AiException(AiErrorCode.AI_PERMISSION_DENIED, "Must be course owner, teacher, or TA");
                }
                break;
            default:
                throw new AiException(AiErrorCode.AI_PERMISSION_DENIED, "Unknown task type");
        }
    }

    private UUID extractCourseId(Map<String, Object> context) {
        if (context == null) return null;
        Object courseIdObj = context.get("courseId");
        if (courseIdObj == null) return null;
        try {
            return UUID.fromString(courseIdObj.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String resolveGlobalRole(String fallback) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            for (GrantedAuthority authority : auth.getAuthorities()) {
                String authStr = authority.getAuthority();
                if (authStr.startsWith("ROLE_")) {
                    return authStr.substring(5).toLowerCase();
                }
            }
        }
        return fallback;
    }
}
