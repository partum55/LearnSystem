package com.university.lms.ai.prompt;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AiSchemaRegistry {

    private final ObjectMapper mapper;

    public AiSchemaRegistry(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    private Map<String, Object> parseSchema(String json) {
        try {
            return mapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse static JSON schema", e);
        }
    }

    public Map<String, Object> getRichContentSchema() {
        return richContentSchema();
    }

    public Map<String, Object> getGenerateCourseSchema() {
        return getGenerateCourseSchemaInlined();
    }

    public Map<String, Object> getGenerateCourseSchemaInlined() {
        return parseSchema("""
        {
          "type": "object",
          "required": ["course", "modules"],
          "additionalProperties": false,
          "propertyOrdering": ["course", "modules"],
          "properties": {
            "course": {
              "type": "object",
              "required": ["title", "code", "description", "syllabusJson"],
              "additionalProperties": false,
              "propertyOrdering": ["title", "code", "description", "syllabusJson"],
              "properties": {
                "title": { "type": "string" },
                "code": { "type": "string" },
                "description": { "type": "string" },
                "syllabusJson": %s
              }
            },
            "modules": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["title", "description", "orderIndex", "learningItems", "assignments"],
                "additionalProperties": false,
                "propertyOrdering": ["title", "description", "orderIndex", "learningItems", "assignments"],
                "properties": {
                  "title": { "type": "string" },
                  "description": { "type": "string" },
                  "orderIndex": { "type": "integer", "minimum": 0 },
                  "learningItems": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "required": ["type", "title", "contentJson"],
                      "additionalProperties": false,
                      "propertyOrdering": ["type", "title", "contentJson"],
                      "properties": {
                        "type": { "type": "string", "enum": ["RTE", "LESSON"] },
                        "title": { "type": "string" },
                        "contentJson": %s
                      }
                    }
                  },
                  "assignments": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "required": ["type", "title", "points", "instructionsJson", "settings"],
                      "additionalProperties": false,
                      "propertyOrdering": ["type", "title", "points", "instructionsJson", "settings"],
                      "properties": {
                        "type": { "type": "string", "enum": ["TEXT_SUBMISSION"] },
                        "title": { "type": "string" },
                        "points": { "type": "integer", "minimum": 1 },
                        "instructionsJson": %s,
                        "settings": { "type": "object", "additionalProperties": true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """.formatted(richContentJson(), richContentJson(), richContentJson()));
    }

    public Map<String, Object> getGenerateRteMaterialSchema() {
        return parseSchema("""
        {
          "type": "object",
          "required": ["title", "contentJson"],
          "additionalProperties": false,
          "propertyOrdering": ["title", "contentJson"],
          "properties": {
            "title": { "type": "string" },
            "contentJson": %s
          }
        }
        """.formatted(richContentJson()));
    }

    public Map<String, Object> getGenerateAssignmentSchema() {
        return parseSchema("""
        {
          "type": "object",
          "required": ["type", "title", "points", "instructionsJson", "settings"],
          "additionalProperties": false,
          "propertyOrdering": ["type", "title", "points", "instructionsJson", "settings"],
          "properties": {
            "type": { "type": "string", "enum": ["TEXT_SUBMISSION"] },
            "title": { "type": "string" },
            "points": { "type": "integer", "minimum": 1 },
            "instructionsJson": %s,
            "settings": { "type": "object", "additionalProperties": true }
          }
        }
        """.formatted(richContentJson()));
    }

    public Map<String, Object> getSuggestGradeSchema() {
        return parseSchema("""
        {
          "type": "object",
          "required": ["suggestedScore", "maxScore", "feedbackJson", "reasoningSummary", "rubricBreakdown"],
          "additionalProperties": false,
          "propertyOrdering": ["suggestedScore", "maxScore", "feedbackJson", "reasoningSummary", "rubricBreakdown"],
          "properties": {
            "suggestedScore": { "type": "integer", "minimum": 0 },
            "maxScore": { "type": "integer", "minimum": 1 },
            "feedbackJson": %s,
            "reasoningSummary": {
              "type": "array",
              "items": { "type": "string" }
            },
            "rubricBreakdown": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["criterion", "suggestedPoints", "maxPoints", "comment"],
                "additionalProperties": false,
                "properties": {
                  "criterion": { "type": "string" },
                  "suggestedPoints": { "type": "integer", "minimum": 0 },
                  "maxPoints": { "type": "integer", "minimum": 1 },
                  "comment": { "type": "string" }
                }
              }
            }
          }
        }
        """.formatted(richContentJson()));
    }

    private Map<String, Object> richContentSchema() {
        return parseSchema(richContentJson());
    }

    private String richContentJson() {
        return """
        {
          "type": "object",
          "required": ["version", "type", "blocks"],
          "additionalProperties": false,
          "propertyOrdering": ["version", "type", "blocks"],
          "properties": {
            "version": { "type": "integer", "enum": [1] },
            "type": { "type": "string", "enum": ["RICH_CONTENT"] },
            "blocks": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["type", "data"],
                "additionalProperties": false,
                "propertyOrdering": ["type", "data"],
                "properties": {
                  "type": {
                    "type": "string",
                    "enum": ["heading", "paragraph", "list", "quote", "code", "mermaid", "math"]
                  },
                  "data": { "type": "object", "additionalProperties": true }
                }
              }
            }
          }
        }
        """;
    }
}
