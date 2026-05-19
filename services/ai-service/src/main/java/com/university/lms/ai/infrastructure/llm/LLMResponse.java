package com.university.lms.ai.infrastructure.llm;

import java.time.Instant;
import lombok.Builder;
import lombok.Data;

/** Response from an LLM provider. */
@Data
@Builder
public class LLMResponse {

  /** Generated text content */
  private String content;

  /** Provider that generated this response */
  private String provider;

  /** Model used for generation */
  private String model;

  /** Number of tokens in the prompt */
  private int promptTokens;

  /** Number of tokens in the completion */
  private int completionTokens;

  /** Total tokens used */
  private int totalTokens;

  /** Time taken for generation in milliseconds */
  private long latencyMs;

  /** Timestamp of generation */
  @Builder.Default private Instant timestamp = Instant.now();

  /** Whether this response was from cache */
  @Builder.Default private boolean cached = false;

  /** Create a simple response with just content */
  public static LLMResponse of(String content, String provider) {
    return LLMResponse.builder().content(content).provider(provider).build();
  }
}
