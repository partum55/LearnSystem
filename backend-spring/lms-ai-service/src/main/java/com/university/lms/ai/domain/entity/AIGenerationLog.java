package com.university.lms.ai.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Entity for logging AI generation requests for audit and analytics.
 */
@Entity
@Table(name = "ai_generation_logs", indexes = {
        @Index(name = "idx_ai_generation_logs_user", columnList = "user_id"),
        @Index(name = "idx_ai_generation_logs_created", columnList = "created_at"),
        @Index(name = "idx_ai_generation_logs_type", columnList = "content_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIGenerationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * Type of content generated (course, module, quiz, assignment, explanation)
     */
    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    /**
     * Name of the prompt template used (if any)
     */
    @Column(name = "prompt_template_name", length = 100)
    private String promptTemplateName;

    /**
     * LLM provider used (groq, openai, etc.)
     */
    @Column(nullable = false, length = 50)
    private String provider;

    /**
     * Model used for generation
     */
    @Column(length = 100)
    private String model;

    /**
     * Number of tokens in the prompt
     */
    @Column(name = "prompt_tokens")
    @Builder.Default
    private int promptTokens = 0;

    /**
     * Number of tokens in the completion
     */
    @Column(name = "completion_tokens")
    @Builder.Default
    private int completionTokens = 0;

    /**
     * Latency in milliseconds
     */
    @Column(name = "latency_ms")
    @Builder.Default
    private long latencyMs = 0;

    /**
     * Whether generation was successful
     */
    @Builder.Default
    private boolean success = true;

    /**
     * Error message if generation failed
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * User who initiated the request
     */
    @Column(name = "user_id", length = 36)
    private String userId;

    /**
     * Related course ID
     */
    @Column(name = "course_id", length = 36)
    private String courseId;

    /**
     * Created timestamp
     */
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    /**
     * Create a success log entry
     */
    public static AIGenerationLog success(String contentType, String provider, String model,
                                          int promptTokens, int completionTokens, long latencyMs,
                                          String userId, String courseId) {
        return AIGenerationLog.builder()
                .contentType(contentType)
                .provider(provider)
                .model(model)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .latencyMs(latencyMs)
                .success(true)
                .userId(userId)
                .courseId(courseId)
                .build();
    }

    /**
     * Create a failure log entry
     */
    public static AIGenerationLog failure(String contentType, String provider,
                                          String errorMessage, String userId, String courseId) {
        return AIGenerationLog.builder()
                .contentType(contentType)
                .provider(provider != null ? provider : "unknown")
                .success(false)
                .errorMessage(errorMessage)
                .userId(userId)
                .courseId(courseId)
                .build();
    }
}

