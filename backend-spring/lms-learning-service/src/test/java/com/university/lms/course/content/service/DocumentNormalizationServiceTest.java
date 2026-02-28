package com.university.lms.course.content.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class DocumentNormalizationServiceTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final DocumentNormalizationService service = new DocumentNormalizationService();

  @Test
  void normalizesNumberedParagraphAndFootnoteSequences() throws Exception {
    JsonNode input =
        objectMapper.readTree(
            """
            {
              "type": "doc",
              "content": [
                {"type": "numberedParagraph", "content": [{"type":"text","text":"A"}]},
                {"type": "paragraph", "content": [{"type":"text","text":"B"}]},
                {"type": "numberedParagraph", "attrs":{"sequence": 99}, "content": [{"type":"text","text":"C"}]},
                {"type": "footnote", "content": [{"type":"text","text":"N1"}]},
                {"type": "footnote", "attrs":{"key":"custom-key"}, "content": [{"type":"text","text":"N2"}]}
              ]
            }
            """);

    JsonNode normalized = service.normalize(input);

    JsonNode firstNumbered = normalized.path("content").get(0);
    JsonNode secondNumbered = normalized.path("content").get(2);
    JsonNode firstFootnote = normalized.path("content").get(3);
    JsonNode secondFootnote = normalized.path("content").get(4);

    assertEquals(1, firstNumbered.path("attrs").path("sequence").asInt());
    assertEquals(2, secondNumbered.path("attrs").path("sequence").asInt());

    assertEquals(1, firstFootnote.path("attrs").path("ordinal").asInt());
    assertEquals("fn-1", firstFootnote.path("attrs").path("key").asText());
    assertEquals(2, secondFootnote.path("attrs").path("ordinal").asInt());
    assertEquals("custom-key", secondFootnote.path("attrs").path("key").asText());
  }
}
