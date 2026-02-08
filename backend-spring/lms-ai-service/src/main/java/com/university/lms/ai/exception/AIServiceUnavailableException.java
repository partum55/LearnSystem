package com.university.lms.ai.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when AI service is unavailable. Used as fallback response when circuit breaker
 * is open or all LLM providers fail.
 */
@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class AIServiceUnavailableException extends RuntimeException {

  public AIServiceUnavailableException(String message) {
    super(message);
  }

  public AIServiceUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }

  /** Creates an exception for circuit breaker open state. */
  public static AIServiceUnavailableException circuitBreakerOpen() {
    return new AIServiceUnavailableException(
        "AI service is temporarily unavailable due to high failure rate. Please try again later.");
  }

  /** Creates an exception for timeout. */
  public static AIServiceUnavailableException timeout() {
    return new AIServiceUnavailableException("AI service request timed out. Please try again.");
  }

  /** Creates an exception when all providers have failed. */
  public static AIServiceUnavailableException allProvidersFailed() {
    return new AIServiceUnavailableException(
        "All AI providers are currently unavailable. Please try again later.");
  }
}
