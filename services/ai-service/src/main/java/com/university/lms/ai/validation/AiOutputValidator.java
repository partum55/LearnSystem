package com.university.lms.ai.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.university.lms.ai.domain.model.AiErrorCode;
import com.university.lms.ai.exception.AiException;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class AiOutputValidator {

    private static final Set<String> ASSIGNMENT_TYPES = Set.of(
            "TEXT_SUBMISSION", "FILE_SUBMISSION", "QUIZ", "FORM", "VPL", "SEMINAR"
    );

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
                    validateCourseLearningItem(item);
                }
            }
            if (module.has("assignments")) {
                for (JsonNode assign : module.get("assignments")) {
                    validateCourseAssignmentDraft(assign);
                }
            }
        }
    }

    private void validateCourseLearningItem(JsonNode output) {
        if (!output.has("title")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Course material must have 'title'");
        }
        if (output.has("contentJson")) {
            richContentValidator.validate(output.get("contentJson"));
        }
    }

    private void validateCourseAssignmentDraft(JsonNode output) {
        if (!output.has("title")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Course assignment must have 'title'");
        }
        if (output.has("instructionsJson")) {
            richContentValidator.validate(output.get("instructionsJson"));
        }
    }

    public void validateRteMaterial(JsonNode output) {
        if (!output.has("title") || !output.has("contentJson")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Material must have 'title' and 'contentJson'");
        }
        richContentValidator.validateRequired(output.get("contentJson"));
    }

    public void validateAssignmentDraft(JsonNode output) {
        if (!output.has("type") || !output.has("title") || !output.has("points") || !output.has("instructionsJson")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Assignment must have 'type', 'title', 'points', and 'instructionsJson'");
        }
        
        String type = output.get("type").asText();
        if (!ASSIGNMENT_TYPES.contains(type)) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Assignment type must be canonical");
        }

        richContentValidator.validateRequired(output.get("instructionsJson"));
    }

    public void validateGradeSuggestion(JsonNode output) {
        if (!output.has("suggestedScore") || !output.has("feedbackJson")) {
            throw new AiException(AiErrorCode.AI_OUTPUT_INVALID, "Grade suggestion must have 'suggestedScore' and 'feedbackJson'");
        }
        richContentValidator.validateRequired(output.get("feedbackJson"));
    }
}
