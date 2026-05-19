package com.university.lms.course.content.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class DocumentValidationServiceTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private DocumentValidationService service;

  @BeforeEach
  void setUp() {
    service = new DocumentValidationService(objectMapper);
    ReflectionTestUtils.setField(service, "maxJsonBytes", 1_000_000);
    ReflectionTestUtils.setField(service, "maxBlocks", 20);
    ReflectionTestUtils.setField(service, "maxTableRows", 5);
    ReflectionTestUtils.setField(service, "maxTableColumns", 5);
    ReflectionTestUtils.setField(service, "allowedEmbedHosts", "youtube.com,www.youtube.com,youtu.be");
    ReflectionTestUtils.invokeMethod(service, "init");
  }

  @Test
  void acceptsValidFullDocument() throws Exception {
    JsonNode document =
        objectMapper.readTree(
            """
            {
              "version": 1,
              "type": "doc",
              "content": [
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Intro"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Body"}]}
              ]
            }
            """);

    assertDoesNotThrow(() -> service.validate(document, EditorMode.FULL));
  }

  @Test
  void rejectsEmbedInLiteMode() throws Exception {
    JsonNode document =
        objectMapper.readTree(
            """
            {
              "version": 1,
              "type": "doc",
              "content": [
                {
                  "type": "embed",
                  "attrs": {
                    "provider": "youtube",
                    "url": "https://www.youtube.com/watch?v=abc123"
                  }
                }
              ]
            }
            """);

    assertThrows(ValidationException.class, () -> service.validate(document, EditorMode.LITE));
  }

  @Test
  void rejectsTableAboveConfiguredLimits() throws Exception {
    JsonNode document =
        objectMapper.readTree(
            """
            {
              "version": 1,
              "type": "doc",
              "content": [
                {
                  "type": "table",
                  "content": [
                    {"type":"tableRow","content":[{"type":"tableCell"},{"type":"tableCell"},{"type":"tableCell"},{"type":"tableCell"},{"type":"tableCell"},{"type":"tableCell"}]}
                  ]
                }
              ]
            }
            """);

    assertThrows(ValidationException.class, () -> service.validate(document, EditorMode.FULL));
  }

  @Test
  void rejectsEmbedHostOutsideAllowlist() throws Exception {
    JsonNode document =
        objectMapper.readTree(
            """
            {
              "version": 1,
              "type": "doc",
              "content": [
                {
                  "type": "embed",
                  "attrs": {
                    "provider": "youtube",
                    "url": "https://evil.example.com/watch?v=abc123"
                  }
                }
              ]
            }
            """);

    assertThrows(ValidationException.class, () -> service.validate(document, EditorMode.FULL));
  }

  @Test
  void acceptsPdfEmbedUsingInternalMediaPath() throws Exception {
    JsonNode document =
        objectMapper.readTree(
            """
            {
              "version": 1,
              "type": "doc",
              "content": [
                {
                  "type": "embed",
                  "attrs": {
                    "provider": "pdf",
                    "url": "/api/editor/media/7f0f3676-d457-4e7f-a790-b43531b2c483"
                  }
                }
              ]
            }
            """);

    assertDoesNotThrow(() -> service.validate(document, EditorMode.FULL));
  }

  @Test
  void acceptsMermaidBlock() throws Exception {
    JsonNode document =
        objectMapper.readTree(
            """
            {
              "version": 1,
              "type": "doc",
              "content": [
                {
                  "type": "mermaid",
                  "attrs": {
                    "code": "graph TD\\n  A[Start] --> B[Done]"
                  }
                }
              ]
            }
            """);

    assertDoesNotThrow(() -> service.validate(document, EditorMode.FULL));
  }

  @Test
  void rejectsMermaidWithoutCode() throws Exception {
    JsonNode document =
        objectMapper.readTree(
            """
            {
              "version": 1,
              "type": "doc",
              "content": [
                {
                  "type": "mermaid",
                  "attrs": {
                    "code": "   "
                  }
                }
              ]
            }
            """);

    assertThrows(ValidationException.class, () -> service.validate(document, EditorMode.FULL));
  }
}
