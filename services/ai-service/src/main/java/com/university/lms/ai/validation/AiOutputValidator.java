package com.university.lms.ai.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.domain.model.AiErrorCode;
import com.university.lms.ai.exception.AiException;
import org.springframework.stereotype.Component;

@Component
public class AiOutputValidator {

    private final RichContentValidator richContentValidator;

    public AiOutputValidator(RichContentValidator richContentValidator) {
        this.richContentValidator = richContentValidator;
    }

    public void validateCourseDraft(JsonNode output) {
        if (!output.has("course") || !output.has("modules")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Course output must contain 'course' and 'modules'");
        }
        JsonNode course = output.get("course");
        if (!course.has("title") || !course.has("code")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Course must have title and code");
        }
        
        if (course.has("syllabusJson")) {
            richContentValidator.validate(course.get("syllabusJson"));
        }

        JsonNode modules = output.get("modules");
        if (!modules.isArray()) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "'modules' must be an array");
        }

        for (JsonNode module : modules) {
            if (!module.has("title")) {
                throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Module must have title");
            }
            if (module.has("learningItems")) {
                for (JsonNode item : module.get("learningItems")) {
                    validateRteMaterial(item);
                }
            }
            if (module.has("assignments")) {
                for (JsonNode assign : module.get("assignments")) {
                    validateAssignmentDraft(assign);
                }
            }
        }
    }

    public void validateRteMaterial(JsonNode output) {
        if (!output.has("title") || !output.has("contentJson")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Material must have 'title' and 'contentJson'");
        }
        richContentValidator.validate(output.get("contentJson"));
    }

    public void validateAssignmentDraft(JsonNode output) {
        if (!output.has("type") || !output.has("title") || !output.has("points") || !output.has("instructionsJson")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Assignment must have 'type', 'title', 'points', and 'instructionsJson'");
        }
        
        String type = output.get("type").asText();
        if (!type.equals(type.toUpperCase())) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Enums like 'type' must be uppercase");
        }

        richContentValidator.validate(output.get("instructionsJson"));
    }

    public void validateGradeSuggestion(JsonNode output) {
        if (!output.has("suggestedScore") || !output.has("feedbackJson")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Grade suggestion must have 'suggestedScore' and 'feedbackJson'");
        }
        richContentValidator.validate(output.get("feedbackJson"));
    }
}
