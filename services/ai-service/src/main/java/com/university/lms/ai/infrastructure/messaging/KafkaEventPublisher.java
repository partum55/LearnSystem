package com.university.lms.ai.infrastructure.messaging;

import com.university.lms.ai.domain.event.AIContentGeneratedEvent;
import com.university.lms.ai.infrastructure.llm.LLMResponse;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

/** Publishes AI-related events to Kafka topics. */
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaEventPublisher {

  private final KafkaTemplate<String, Object> kafkaTemplate;

  @Value("${kafka.topics.ai-content-generated:lms.ai.content.generated}")
  private String aiContentGeneratedTopic;

  @Value("${kafka.topics.ai-generation-failed:lms.ai.generation.failed}")
  private String aiGenerationFailedTopic;

  @Value("${kafka.enabled:true}")
  private boolean kafkaEnabled;

  /**
   * Publish AI content generated event.
   *
   * @param contentType Type of content (course, quiz, etc.)
   * @param response LLM response
   * @param courseId Related course ID
   * @param userId User who requested generation
   * @param metadata Additional metadata
   */
  public void publishContentGenerated(
      String contentType,
      LLMResponse response,
      String courseId,
      String userId,
      Map<String, Object> metadata) {
    if (!kafkaEnabled) {
      log.debug("Kafka disabled, skipping event publish");
      return;
    }

    AIContentGeneratedEvent event =
        AIContentGeneratedEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .contentType(contentType)
            .courseId(courseId)
            .userId(userId)
            .provider(response.getProvider())
            .model(response.getModel())
            .promptTokens(response.getPromptTokens())
            .completionTokens(response.getCompletionTokens())
            .latencyMs(response.getLatencyMs())
            .success(true)
            .metadata(metadata)
            .build();

    publishEvent(aiContentGeneratedTopic, courseId, event);
  }

  /** Publish AI generation success event. */
  public void publishContentGenerated(
      String contentType, LLMResponse response, String courseId, String userId) {
    publishContentGenerated(contentType, response, courseId, userId, null);
  }

  /** Publish AI generation failure event. */
  public void publishGenerationFailed(
      String contentType, String courseId, String userId, String errorMessage) {
    if (!kafkaEnabled) {
      log.debug("Kafka disabled, skipping event publish");
      return;
    }

    AIContentGeneratedEvent event =
        AIContentGeneratedEvent.failure(contentType, courseId, userId, errorMessage);

    publishEvent(aiGenerationFailedTopic, courseId, event);
  }

  /** Internal method to publish event to Kafka. */
  private void publishEvent(String topic, String key, Object event) {
    try {
      CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(topic, key, event);

      future.whenComplete(
          (result, ex) -> {
            if (ex != null) {
              log.error("Failed to publish event to topic {}: {}", topic, ex.getMessage());
            } else {
              log.info(
                  "Published event to topic {} with key {}, offset: {}",
                  topic,
                  key,
                  result.getRecordMetadata().offset());
            }
          });
    } catch (Exception e) {
      log.error("Error publishing event to Kafka topic {}: {}", topic, e.getMessage());
    }
  }
}
