package com.university.lms.ai.infrastructure.llm;

/**
 * Interface for LLM providers that can generate text. Supports multiple providers with
 * priority-based failover.
 */
public interface LLMProvider {

  /**
   * @return Unique name of this provider (e.g., "groq", "openai")
   */
  String getName();

  /**
   * @return Priority (lower = higher priority). Used for failover ordering.
   */
  int getPriority();

  /** Check if this provider is available/configured. */
  boolean isAvailable();

  /**
   * Generate text using this provider.
   *
   * @param prompt User prompt
   * @param systemPrompt System prompt for context
   * @param options Generation options (temperature, max tokens, etc.)
   * @return Generated text response
   * @throws LLMProviderException if generation fails
   */
  LLMResponse generate(String prompt, String systemPrompt, LLMGenerationOptions options);

  /**
   * Generate text using a specific API key (for per-user key support).
   * Default implementation delegates to the standard generate method.
   */
  default LLMResponse generate(String prompt, String systemPrompt, LLMGenerationOptions options, String apiKey) {
    return generate(prompt, systemPrompt, options);
  }

  /** Get current health status of this provider. */
  default ProviderHealth getHealth() {
    return isAvailable() ? ProviderHealth.HEALTHY : ProviderHealth.UNAVAILABLE;
  }

  enum ProviderHealth {
    HEALTHY,
    DEGRADED,
    UNAVAILABLE
  }
}
