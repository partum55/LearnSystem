package com.university.lms.course.content.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.course.content.domain.ModulePage;
import com.university.lms.course.content.domain.PageCitation;
import com.university.lms.course.content.domain.PageFootnote;
import com.university.lms.course.content.repository.PageCitationRepository;
import com.university.lms.course.content.repository.PageFootnoteRepository;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Maintains searchable citation and footnote indexes derived from canonical documents. */
@Service
@RequiredArgsConstructor
public class PageDocumentIndexingService {

  private final PageCitationRepository pageCitationRepository;
  private final PageFootnoteRepository pageFootnoteRepository;
  private final ObjectMapper objectMapper;

  @Transactional
  public void reindex(ModulePage page, Map<String, Object> documentPayload) {
    JsonNode root = objectMapper.valueToTree(documentPayload);

    pageCitationRepository.deleteByPageId(page.getId());
    pageFootnoteRepository.deleteByPageId(page.getId());

    List<PageCitation> citations = new ArrayList<>();
    List<PageFootnote> footnotes = new ArrayList<>();
    AtomicInteger footnoteOrdinal = new AtomicInteger(0);

    walk(root, page, citations, footnotes, footnoteOrdinal);

    if (!citations.isEmpty()) {
      pageCitationRepository.saveAll(citations);
    }

    if (!footnotes.isEmpty()) {
      pageFootnoteRepository.saveAll(footnotes);
    }
  }

  private void walk(
      JsonNode node,
      ModulePage page,
      List<PageCitation> citations,
      List<PageFootnote> footnotes,
      AtomicInteger footnoteOrdinal) {
    if (!node.isObject()) {
      return;
    }

    String type = node.path("type").asText("");

    if ("citation".equals(type)) {
      citations.add(buildCitation(page, node));
    }

    if ("footnote".equals(type)) {
      footnotes.add(buildFootnote(page, node, footnoteOrdinal.incrementAndGet()));
    }

    JsonNode content = node.path("content");
    if (content.isArray()) {
      for (JsonNode child : content) {
        walk(child, page, citations, footnotes, footnoteOrdinal);
      }
    }
  }

  private PageCitation buildCitation(ModulePage page, JsonNode node) {
    JsonNode attrs = node.path("attrs");
    return PageCitation.builder()
        .page(page)
        .blockId(readText(node.path("id"), null))
        .author(readText(attrs.path("author"), null))
        .title(readText(attrs.path("title"), null))
        .year(attrs.path("year").isNumber() ? attrs.path("year").asInt() : null)
        .url(readText(attrs.path("url"), null))
        .citationType(readText(attrs.path("citationType"), readText(attrs.path("type"), null)))
        .build();
  }

  private PageFootnote buildFootnote(ModulePage page, JsonNode node, int ordinal) {
    JsonNode attrs = node.path("attrs");
    String footnoteKey = readText(attrs.path("key"), readText(node.path("id"), "footnote-" + ordinal));

    Map<String, Object> content = new HashMap<>();
    content.put(
        "content",
        objectMapper.convertValue(node.path("content"), new com.fasterxml.jackson.core.type.TypeReference<>() {}));

    return PageFootnote.builder()
        .page(page)
        .footnoteKey(footnoteKey)
        .ordinal(ordinal)
        .contentJson(content)
        .build();
  }

  private String readText(JsonNode node, String fallback) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return fallback;
    }
    String value = node.asText("").trim();
    return value.isBlank() ? fallback : value;
  }
}
