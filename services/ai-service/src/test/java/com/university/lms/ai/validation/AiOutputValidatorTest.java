package com.university.lms.ai.validation;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.ai.exception.AiOutputInvalidException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AiOutputValidatorTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private AiOutputValidator validator;

    @BeforeEach
    void setUp() {
        validator = new AiOutputValidator(new RichContentValidator());
    }

    @Test
    void validatesRteMaterialFixture() throws Exception {
        assertDoesNotThrow(() -> validator.validateRteMaterial(json("""
        {
          "title": "Unit Testing Basics",
          "contentJson": {
            "version": 1,
            "type": "RICH_CONTENT",
            "blocks": [
              { "type": "paragraph", "data": { "text": "Tests describe expected behavior." } }
            ]
          }
        }
        """)));
    }

    @Test
    void rejectsInvalidRteMaterialFixtureWithPathDiagnostics() throws Exception {
        AiOutputInvalidException exception = assertThrows(
                AiOutputInvalidException.class,
                () -> validator.validateRteMaterial(json("""
                {
                  "title": "Broken",
                  "contentJson": {}
                }
                """)));

        assertTrue(exception.getDiagnostics().contains("output.contentJson.version"));
        assertTrue(exception.getDiagnostics().contains("expected integer 1"));
    }

    @Test
    void validatesAssignmentFixture() throws Exception {
        assertDoesNotThrow(() -> validator.validateAssignmentDraft(json("""
        {
          "type": "TEXT_SUBMISSION",
          "title": "Reflection",
          "points": 10,
          "instructionsJson": {
            "version": 1,
            "type": "RICH_CONTENT",
            "blocks": [
              { "type": "paragraph", "data": { "text": "Explain what a useful unit test checks." } }
            ]
          },
          "settings": {}
        }
        """)));
    }

    @Test
    void rejectsInvalidAssignmentFixtureWithPathDiagnostics() throws Exception {
        AiOutputInvalidException exception = assertThrows(
                AiOutputInvalidException.class,
                () -> validator.validateAssignmentDraft(json("""
                {
                  "type": "text_submission",
                  "title": "Broken",
                  "points": 0,
                  "instructionsJson": {
                    "version": 1,
                    "type": "RICH_CONTENT",
                    "blocks": []
                  },
                  "settings": {}
                }
                """)));

        assertTrue(exception.getDiagnostics().contains("output.type"));
        assertTrue(exception.getDiagnostics().contains("TEXT_SUBMISSION"));
    }

    @Test
    void validatesCourseDraftFixture() throws Exception {
        assertDoesNotThrow(() -> validator.validateCourseDraft(json("""
        {
          "course": {
            "title": "Testing Fundamentals",
            "code": "TEST101",
            "description": "An introduction to software testing.",
            "syllabusJson": {
              "version": 1,
              "type": "RICH_CONTENT",
              "blocks": []
            }
          },
          "modules": [
            {
              "title": "Unit Testing",
              "description": "Writing focused tests.",
              "orderIndex": 0,
              "learningItems": [
                {
                  "type": "RTE",
                  "title": "Arrange Act Assert",
                  "contentJson": {
                    "version": 1,
                    "type": "RICH_CONTENT",
                    "blocks": [
                      { "type": "paragraph", "data": { "text": "AAA structures tests clearly." } }
                    ]
                  }
                }
              ],
              "assignments": [
                {
                  "type": "TEXT_SUBMISSION",
                  "title": "Testing Reflection",
                  "points": 10,
                  "instructionsJson": {
                    "version": 1,
                    "type": "RICH_CONTENT",
                    "blocks": [
                      { "type": "paragraph", "data": { "text": "Submit a short reflection." } }
                    ]
                  },
                  "settings": {}
                }
              ]
            }
          ]
        }
        """)));
    }

    @Test
    void rejectsInvalidCourseDraftFixtureWithPathDiagnostics() throws Exception {
        AiOutputInvalidException exception = assertThrows(
                AiOutputInvalidException.class,
                () -> validator.validateCourseDraft(json("""
                {
                  "course": {
                    "title": "Broken",
                    "code": "BROKEN"
                  },
                  "modules": []
                }
                """)));

        assertTrue(exception.getDiagnostics().contains("output.course.description"));
        assertTrue(exception.getDiagnostics().contains("missing"));
    }

    private JsonNode json(String value) throws Exception {
        return mapper.readTree(value);
    }
}
