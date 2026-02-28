package com.university.lms.course.content.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Canonical editor document payload returned by API endpoints. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CanonicalDocumentDto {

  private UUID ownerId;
  private Integer schemaVersion;
  private String documentHash;
  private JsonNode document;
  private LocalDateTime updatedAt;
  private Boolean publishedSnapshot;

  public static CanonicalDocumentDto empty(UUID ownerId, String title) {
    ObjectNode doc = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
    doc.put("version", 1);
    doc.put("type", "doc");
    ObjectNode meta = doc.putObject("meta");
    meta.put("title", title == null ? "Untitled" : title);
    doc.putArray("content");

    return CanonicalDocumentDto.builder()
        .ownerId(ownerId)
        .schemaVersion(1)
        .documentHash(null)
        .document(doc)
        .publishedSnapshot(false)
        .build();
  }
}
