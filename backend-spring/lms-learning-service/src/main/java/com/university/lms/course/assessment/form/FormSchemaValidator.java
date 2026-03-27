package com.university.lms.course.assessment.form;

import com.university.lms.common.exception.ValidationException;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class FormSchemaValidator {

    /**
     * Extracts form field definitions from an assignment template document JSONB.
     * Form fields are stored as nodes with type "formField" in the Tiptap document.
     */
    public List<Map<String, Object>> extractFormFields(Map<String, Object> templateDoc) {
        List<Map<String, Object>> fields = new ArrayList<>();
        if (templateDoc == null) return fields;
        extractFieldsRecursive(templateDoc, fields);
        return fields;
    }

    @SuppressWarnings("unchecked")
    private void extractFieldsRecursive(Map<String, Object> node, List<Map<String, Object>> fields) {
        String type = (String) node.get("type");
        if ("formField".equals(type)) {
            Map<String, Object> attrs = (Map<String, Object>) node.getOrDefault("attrs", Map.of());
            fields.add(attrs);
        }
        List<Map<String, Object>> content = (List<Map<String, Object>>) node.get("content");
        if (content != null) {
            for (Map<String, Object> child : content) {
                extractFieldsRecursive(child, fields);
            }
        }
    }

    /**
     * Validates submitted form data against the schema extracted from the template.
     */
    public void validate(Map<String, Object> formData, List<Map<String, Object>> fieldDefs) {
        if (formData == null) formData = Map.of();

        for (Map<String, Object> field : fieldDefs) {
            String fieldId = (String) field.get("fieldId");
            Boolean required = Boolean.TRUE.equals(field.get("required"));

            if (required && fieldId != null) {
                Object value = formData.get(fieldId);
                if (value == null || (value instanceof String && ((String) value).isBlank())) {
                    throw new ValidationException("Required field '" + field.getOrDefault("label", fieldId) + "' is missing");
                }
            }
        }
    }
}
