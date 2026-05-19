package com.university.lms.ai.service;

import com.university.lms.ai.domain.entity.AIGenerationLog;
import com.university.lms.ai.infrastructure.llm.LLMResponse;
import com.university.lms.ai.repository.AIGenerationLogRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Service for auditing AI generation requests. Logs all prompts, responses, and metrics for
 * observability and compliance.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AIAuditService {

  private final AIGenerationLogRepository logRepository;

  /** Log a successful AI generation request asynchronously. */
  @Async("aiTaskExecutor")
  public void logSuccess(
      String contentType,
      String promptTemplateName,
      LLMResponse response,
      String userId,
      String courseId) {
    try {
      AIGenerationLog logEntry =
          AIGenerationLog.builder()
              .contentType(contentType)
              .promptTemplateName(promptTemplateName)
              .provider(response.getProvider())
              .model(response.getModel())
              .promptTokens(response.getPromptTokens())
              .completionTokens(response.getCompletionTokens())
              .latencyMs(response.getLatencyMs())
              .success(true)
              .userId(userId)
              .courseId(courseId)
              .build();

      logRepository.save(logEntry);

      log.info(
          "AI audit log: type={}, provider={}, tokens={}, latency={}ms, user={}",
          contentType,
          response.getProvider(),
          response.getTotalTokens(),
          response.getLatencyMs(),
          userId);

    } catch (Exception e) {
      log.error("Failed to save AI audit log", e);
    }
  }

  /** Log a failed AI generation request asynchronously. */
  @Async("aiTaskExecutor")
  public void logFailure(
      String contentType,
      String promptTemplateName,
      String provider,
      String errorMessage,
      String userId,
      String courseId) {
    try {
      AIGenerationLog logEntry =
          AIGenerationLog.builder()
              .contentType(contentType)
              .promptTemplateName(promptTemplateName)
              .provider(provider != null ? provider : "unknown")
              .success(false)
              .errorMessage(truncateMessage(errorMessage, 1000))
              .userId(userId)
              .courseId(courseId)
              .build();

      logRepository.save(logEntry);

      log.warn(
          "AI audit log (failure): type={}, provider={}, error={}, user={}",
          contentType,
          provider,
          errorMessage,
          userId);

    } catch (Exception e) {
      log.error("Failed to save AI failure audit log", e);
    }
  }

  /** Generate a hash of the prompt for caching and deduplication. */
  public String hashPrompt(String prompt, String systemPrompt) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      String combined = (systemPrompt != null ? systemPrompt : "") + "|" + prompt;
      byte[] hash = digest.digest(combined.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash).substring(0, 16); // First 16 chars
    } catch (NoSuchAlgorithmException e) {
      log.error("SHA-256 not available", e);
      return String.valueOf(prompt.hashCode());
    }
  }

  /** Get total token usage for a user. */
  public Long getTotalTokenUsage(String userId) {
    Long usage = logRepository.getTotalTokenUsageByUser(userId);
    return usage != null ? usage : 0L;
  }

  /** Get usage statistics by content type. */
  public List<Object[]> getUsageByContentType() {
    return logRepository.countSuccessfulByContentType();
  }

  /** Get average latency by provider. */
  public Map<String, Double> getAverageLatencyByProvider() {
    List<Object[]> results = logRepository.getAverageLatencyByProvider();
    return results.stream()
        .collect(java.util.stream.Collectors.toMap(r -> (String) r[0], r -> (Double) r[1]));
  }

  /** Get token usage by provider. */
  public List<Object[]> getTokenUsageByProvider() {
    return logRepository.getTokenUsageByProvider();
  }

  /** Get failure count by provider. */
  public List<Object[]> getFailuresByProvider() {
    return logRepository.countFailuresByProvider();
  }

  /** Get recent logs for a user. */
  public List<AIGenerationLog> getRecentLogsForUser(String userId, int limit) {
    return logRepository
        .findByUserIdOrderByCreatedAtDesc(
            userId, org.springframework.data.domain.PageRequest.of(0, limit))
        .getContent();
  }

  /** Get logs within a date range. */
  public List<AIGenerationLog> getLogsBetween(Instant start, Instant end) {
    return logRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
  }

  /** Get logs for the last N hours. */
  public List<AIGenerationLog> getLogsLastHours(int hours) {
    Instant start = Instant.now().minus(hours, ChronoUnit.HOURS);
    return logRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, Instant.now());
  }

  private String truncateMessage(String message, int maxLength) {
    if (message == null) return null;
    return message.length() > maxLength ? message.substring(0, maxLength) : message;
  }
}
