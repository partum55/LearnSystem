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
        return parseSchema("""
        {
            "type": "OBJECT",
            "properties": {
                "version": { "type": "INTEGER" },
                "type": { "type": "STRING" },
                "blocks": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "type": { "type": "STRING" },
                            "data": { "type": "OBJECT" }
                        }
                    }
                }
            }
        }
        """);
    }

    public Map<String, Object> getGenerateCourseSchema() {
        return parseSchema("""
        {
            "type": "OBJECT",
            "properties": {
                "course": {
                    "type": "OBJECT",
                    "properties": {
                        "title": { "type": "STRING" },
                        "code": { "type": "STRING" },
                        "description": { "type": "STRING" },
                        "syllabusJson": { "$ref": "#/definitions/RichContent" }
                    }
                },
                "modules": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "title": { "type": "STRING" },
                            "description": { "type": "STRING" },
                            "orderIndex": { "type": "INTEGER" },
                            "learningItems": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "type": { "type": "STRING", "enum": ["RTE", "LESSON"] },
                                        "title": { "type": "STRING" },
                                        "contentJson": { "$ref": "#/definitions/RichContent" }
                                    }
                                }
                            },
                            "assignments": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "type": { "type": "STRING", "enum": ["TEXT_SUBMISSION", "FILE_SUBMISSION", "QUIZ", "FORM", "VPL", "SEMINAR"] },
                                        "title": { "type": "STRING" },
                                        "points": { "type": "INTEGER" },
                                        "instructionsJson": { "$ref": "#/definitions/RichContent" },
                                        "settings": { "type": "OBJECT" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        """);
        // Note: Gemini schema might not fully support $ref natively in all versions without careful definitions blocks.
        // If it fails, we will inline the schema. For safety, let's inline RichContent.
    }

    public Map<String, Object> getGenerateCourseSchemaInlined() {
        return parseSchema("""
        {
            "type": "OBJECT",
            "properties": {
                "course": {
                    "type": "OBJECT",
                    "properties": {
                        "title": { "type": "STRING" },
                        "code": { "type": "STRING" },
                        "description": { "type": "STRING" },
                        "syllabusJson": { "type": "OBJECT" }
                    }
                },
                "modules": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "title": { "type": "STRING" },
                            "description": { "type": "STRING" },
                            "orderIndex": { "type": "INTEGER" },
                            "learningItems": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "type": { "type": "STRING", "enum": ["RTE", "LESSON"] },
                                        "title": { "type": "STRING" },
                                        "contentJson": { "type": "OBJECT" }
                                    }
                                }
                            },
                            "assignments": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "type": { "type": "STRING", "enum": ["TEXT_SUBMISSION", "FILE_SUBMISSION", "QUIZ", "FORM", "VPL", "SEMINAR"] },
                                        "title": { "type": "STRING" },
                                        "points": { "type": "INTEGER" },
                                        "instructionsJson": { "type": "OBJECT" },
                                        "settings": { "type": "OBJECT" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        """);
    }

    public Map<String, Object> getGenerateRteMaterialSchema() {
        return parseSchema("""
        {
            "type": "OBJECT",
            "properties": {
                "title": { "type": "STRING" },
                "contentJson": { "type": "OBJECT" }
            }
        }
        """);
    }

    public Map<String, Object> getGenerateAssignmentSchema() {
        return parseSchema("""
        {
            "type": "OBJECT",
            "properties": {
                "type": { "type": "STRING" },
                "title": { "type": "STRING" },
                "points": { "type": "INTEGER" },
                "instructionsJson": { "type": "OBJECT" },
                "settings": { "type": "OBJECT" }
            }
        }
        """);
    }

    public Map<String, Object> getSuggestGradeSchema() {
        return parseSchema("""
        {
            "type": "OBJECT",
            "properties": {
                "suggestedScore": { "type": "INTEGER" },
                "maxScore": { "type": "INTEGER" },
                "feedbackJson": { "type": "OBJECT" },
                "reasoningSummary": {
                    "type": "ARRAY",
                    "items": { "type": "STRING" }
                },
                "rubricBreakdown": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "criterion": { "type": "STRING" },
                            "suggestedPoints": { "type": "INTEGER" },
                            "maxPoints": { "type": "INTEGER" },
                            "comment": { "type": "STRING" }
                        }
                    }
                }
            }
        }
        """);
    }
}
