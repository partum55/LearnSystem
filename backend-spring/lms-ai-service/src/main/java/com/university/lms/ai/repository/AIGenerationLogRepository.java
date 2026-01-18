package com.university.lms.ai.repository;

import com.university.lms.ai.domain.entity.AIGenerationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * Repository for AIGenerationLog entity.
 */
@Repository
public interface AIGenerationLogRepository extends JpaRepository<AIGenerationLog, String> {

    /**
     * Find logs by user ID
     */
    Page<AIGenerationLog> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    /**
     * Find logs by content type
     */
    Page<AIGenerationLog> findByContentTypeOrderByCreatedAtDesc(String contentType, Pageable pageable);

    /**
     * Find logs by course ID
     */
    List<AIGenerationLog> findByCourseIdOrderByCreatedAtDesc(String courseId);

    /**
     * Find logs within a date range
     */
    List<AIGenerationLog> findByCreatedAtBetweenOrderByCreatedAtDesc(Instant start, Instant end);

    /**
     * Count successful generations by content type
     */
    @Query("SELECT l.contentType, COUNT(l) FROM AIGenerationLog l WHERE l.success = true GROUP BY l.contentType")
    List<Object[]> countSuccessfulByContentType();

    /**
     * Get total token usage by provider
     */
    @Query("SELECT l.provider, SUM(l.promptTokens), SUM(l.completionTokens) FROM AIGenerationLog l GROUP BY l.provider")
    List<Object[]> getTokenUsageByProvider();

    /**
     * Get average latency by provider
     */
    @Query("SELECT l.provider, AVG(l.latencyMs) FROM AIGenerationLog l WHERE l.success = true GROUP BY l.provider")
    List<Object[]> getAverageLatencyByProvider();

    /**
     * Get user's total token usage
     */
    @Query("SELECT SUM(l.promptTokens + l.completionTokens) FROM AIGenerationLog l WHERE l.userId = :userId")
    Long getTotalTokenUsageByUser(String userId);

    /**
     * Count failures by provider
     */
    @Query("SELECT l.provider, COUNT(l) FROM AIGenerationLog l WHERE l.success = false GROUP BY l.provider")
    List<Object[]> countFailuresByProvider();

    /**
     * Get overall average latency
     */
    @Query("SELECT AVG(l.latencyMs) FROM AIGenerationLog l WHERE l.success = true")
    Double getAverageLatency();
}

