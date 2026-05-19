package com.university.lms.course.content.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request for storing canonical editor JSON documents. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertCanonicalDocumentRequest {

  @NotNull(message = "Document is required")
  private JsonNode document;

  @Builder.Default
  @Min(value = 1, message = "Schema version must be positive")
  @Max(value = 999, message = "Schema version is out of range")
  private Integer schemaVersion = 1;
}
