package com.university.lms.course.content.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

/** Applies deterministic normalization rules to canonical editor documents before persistence. */
@Service
public class DocumentNormalizationService {

  public JsonNode normalize(JsonNode document) {
    if (document == null || document.isNull()) {
      return document;
    }

    JsonNode copy = document.deepCopy();

    AtomicInteger numberedParagraphCounter = new AtomicInteger(0);
    AtomicInteger footnoteCounter = new AtomicInteger(0);
    normalizeNode(copy, numberedParagraphCounter, footnoteCounter);

    return copy;
  }

  private void normalizeNode(
      JsonNode node, AtomicInteger numberedParagraphCounter, AtomicInteger footnoteCounter) {
    if (!(node instanceof ObjectNode objectNode)) {
      return;
    }

    String type = objectNode.path("type").asText("");

    if ("numberedParagraph".equals(type)) {
      int sequence = numberedParagraphCounter.incrementAndGet();
      ObjectNode attrs = ensureAttrs(objectNode);
      attrs.put("sequence", sequence);
    }

    if ("footnote".equals(type)) {
      int ordinal = footnoteCounter.incrementAndGet();
      ObjectNode attrs = ensureAttrs(objectNode);
      attrs.put("ordinal", ordinal);
      if (!attrs.hasNonNull("key") || attrs.path("key").asText("").isBlank()) {
        attrs.put("key", "fn-" + ordinal);
      }
    }

    JsonNode content = objectNode.path("content");
    if (content instanceof ArrayNode arrayNode) {
      for (JsonNode child : arrayNode) {
        normalizeNode(child, numberedParagraphCounter, footnoteCounter);
      }
    }
  }

  private ObjectNode ensureAttrs(ObjectNode node) {
    JsonNode attrs = node.get("attrs");
    if (attrs instanceof ObjectNode objectNode) {
      return objectNode;
    }
    ObjectNode created = node.objectNode();
    node.set("attrs", created);
    return created;
  }
}
