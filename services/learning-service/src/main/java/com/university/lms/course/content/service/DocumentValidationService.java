package com.university.lms.course.content.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.exception.ValidationException;
import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Validates canonical JSON documents for security, size, and schema constraints. */
@Service
@RequiredArgsConstructor
public class DocumentValidationService {

  private static final Set<String> SHARED_ALLOWED_TYPES =
      Set.of(
          "doc",
          "text",
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "listItem",
          "hardBreak",
          "blockquote",
          "codeBlock",
          "inlineCode",
          "image",
          "mathInline",
          "mathBlock",
          "mermaid");

  private static final Set<String> FULL_ONLY_TYPES =
      Set.of(
          "taskList",
          "taskItem",
          "callout",
          "table",
          "tableRow",
          "tableCell",
          "tableHeader",
          "embed",
          "citation",
          "footnote",
          "numberedParagraph",
          "testCase");

  private static final Set<String> COUNTED_BLOCK_TYPES =
      Set.of(
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "blockquote",
          "codeBlock",
          "image",
          "mathBlock",
          "mermaid",
          "taskList",
          "table",
          "callout",
          "embed",
          "citation",
          "footnote",
          "numberedParagraph",
          "testCase");

  private final ObjectMapper objectMapper;

  @Value("${editor.document.max-json-bytes:2097152}")
  private int maxJsonBytes;

  @Value("${editor.document.max-blocks:2000}")
  private int maxBlocks;

  @Value("${editor.table.max-rows:100}")
  private int maxTableRows;

  @Value("${editor.table.max-columns:20}")
  private int maxTableColumns;

  @Value("${editor.embed.allowed-hosts:youtube.com,www.youtube.com,youtu.be}")
  private String allowedEmbedHosts;

  private Set<String> allowedHosts = Set.of();

  @PostConstruct
  void init() {
    Set<String> hosts = new HashSet<>();
    for (String host : allowedEmbedHosts.split(",")) {
      String normalized = host.trim().toLowerCase(Locale.ROOT);
      if (!normalized.isBlank()) {
        hosts.add(normalized);
      }
    }
    allowedHosts = Set.copyOf(hosts);
  }

  public void validate(JsonNode document, EditorMode mode) {
    if (document == null || document.isNull()) {
      throw new ValidationException("Document payload is required");
    }

    int size;
    try {
      size = objectMapper.writeValueAsBytes(document).length;
    } catch (Exception ex) {
      throw new ValidationException("Failed to serialize document JSON");
    }

    if (size > maxJsonBytes) {
      throw new ValidationException("Document exceeds maximum allowed size");
    }

    if (!document.isObject()) {
      throw new ValidationException("Document root must be an object");
    }

    if (!"doc".equals(document.path("type").asText())) {
      throw new ValidationException("Document root type must be 'doc'");
    }

    if (!document.path("content").isArray()) {
      throw new ValidationException("Document root must include a content array");
    }

    AtomicInteger blockCount = new AtomicInteger();
    walkNode(document, mode, blockCount);
  }

  private void walkNode(JsonNode node, EditorMode mode, AtomicInteger blockCount) {
    if (!node.isObject()) {
      return;
    }

    String type = node.path("type").asText("");
    if (!type.isBlank()) {
      ensureTypeAllowed(type, mode);

      if (COUNTED_BLOCK_TYPES.contains(type) && blockCount.incrementAndGet() > maxBlocks) {
        throw new ValidationException("Document exceeds maximum allowed block count");
      }

      if ("table".equals(type)) {
        validateTable(node);
      }

      if ("embed".equals(type)) {
        validateEmbed(node);
      }

      if ("mermaid".equals(type)) {
        validateMermaid(node);
      }
    }

    JsonNode content = node.path("content");
    if (content.isArray()) {
      for (JsonNode child : content) {
        walkNode(child, mode, blockCount);
      }
    }
  }

  private void ensureTypeAllowed(String type, EditorMode mode) {
    if (SHARED_ALLOWED_TYPES.contains(type)) {
      return;
    }

    if (mode == EditorMode.FULL && FULL_ONLY_TYPES.contains(type)) {
      return;
    }

    throw new ValidationException("Unsupported node type: " + type);
  }

  private void validateTable(JsonNode tableNode) {
    JsonNode rows = tableNode.path("content");
    if (!rows.isArray()) {
      throw new ValidationException("Table content must be an array");
    }

    if (rows.size() > maxTableRows) {
      throw new ValidationException("Table exceeds max allowed rows");
    }

    for (JsonNode row : rows) {
      JsonNode columns = row.path("content");
      if (!columns.isArray()) {
        throw new ValidationException("Table row content must be an array");
      }
      if (columns.size() > maxTableColumns) {
        throw new ValidationException("Table exceeds max allowed columns");
      }
    }
  }

  private void validateEmbed(JsonNode embedNode) {
    JsonNode attrs = embedNode.path("attrs");
    String provider = attrs.path("provider").asText("").trim().toLowerCase(Locale.ROOT);
    String url = attrs.path("url").asText("").trim();

    if (provider.isBlank() || url.isBlank()) {
      throw new ValidationException("Embed provider and URL are required");
    }

    if (!provider.equals("youtube") && !provider.equals("pdf")) {
      throw new ValidationException("Unsupported embed provider: " + provider);
    }

    if (provider.equals("pdf")
        && (url.startsWith("/editor/media/") || url.startsWith("/api/editor/media/"))) {
      return;
    }

    String host;
    try {
      host = Optional.ofNullable(URI.create(url).getHost()).orElse("").toLowerCase(Locale.ROOT);
    } catch (Exception ex) {
      throw new ValidationException("Invalid embed URL");
    }

    if (host.isBlank()) {
      throw new ValidationException("Embed URL host is required");
    }

    boolean allowed = allowedHosts.stream().anyMatch(allowedHost -> host.equals(allowedHost) || host.endsWith("." + allowedHost));
    if (!allowed) {
      throw new ValidationException("Embed host is not allowlisted");
    }
  }

  private void validateMermaid(JsonNode mermaidNode) {
    String code = mermaidNode.path("attrs").path("code").asText("");
    if (code.isBlank()) {
      throw new ValidationException("Mermaid block must include diagram code");
    }
    if (code.length() > 12000) {
      throw new ValidationException("Mermaid block exceeds max allowed diagram length");
    }
  }
}
