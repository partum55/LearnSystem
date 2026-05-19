package com.university.lms.ai.domain.event;

import java.time.Instant;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

/** Event published when AI content is generated. */
@Data
@Builder
public class AIContentGeneratedEvent {

  /** Unique event ID */
  private String eventId;

  /** Type of content generated (course, module, quiz, assignment, explanation) */
  private String contentType;

  /** Related course ID (if applicable) */
  private String courseId;

  /** Related module ID (if applicable) */
  private String moduleId;

  /** User who requested the generation */
  private String userId;

  /** LLM provider used */
  private String provider;

  /** Model used for generation */
  private String model;

  /** Prompt tokens used */
  private int promptTokens;

  /** Completion tokens used */
  private int completionTokens;

  /** Generation latency in milliseconds */
  private long latencyMs;

  /** Whether generation was successful */
  @Builder.Default private boolean success = true;

  /** Error message if generation failed */
  private String errorMessage;

  /** Additional metadata */
  private Map<String, Object> metadata;

  /** Event timestamp */
  @Builder.Default private Instant timestamp = Instant.now();

  /** Create a success event */
  public static AIContentGeneratedEvent success(
      String contentType,
      String courseId,
      String userId,
      String provider,
      String model,
      int promptTokens,
      int completionTokens,
      long latencyMs) {
    return AIContentGeneratedEvent.builder()
        .eventId(java.util.UUID.randomUUID().toString())
        .contentType(contentType)
        .courseId(courseId)
        .userId(userId)
        .provider(provider)
        .model(model)
        .promptTokens(promptTokens)
        .completionTokens(completionTokens)
        .latencyMs(latencyMs)
        .success(true)
        .build();
  }

  /** Create a failure event */
  public static AIContentGeneratedEvent failure(
      String contentType, String courseId, String userId, String errorMessage) {
    return AIContentGeneratedEvent.builder()
        .eventId(java.util.UUID.randomUUID().toString())
        .contentType(contentType)
        .courseId(courseId)
        .userId(userId)
        .success(false)
        .errorMessage(errorMessage)
        .build();
  }
}
