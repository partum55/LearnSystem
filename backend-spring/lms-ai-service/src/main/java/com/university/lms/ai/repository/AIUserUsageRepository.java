package com.university.lms.ai.repository;

import com.university.lms.ai.domain.entity.AIUserUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for AIUserUsage entity.
 */
@Repository
public interface AIUserUsageRepository extends JpaRepository<AIUserUsage, String> {

    /**
     * Find usage for a user in a specific period.
     */
    Optional<AIUserUsage> findByUserIdAndUsagePeriod(String userId, String usagePeriod);

    /**
     * Find all usage records for a user.
     */
    List<AIUserUsage> findByUserIdOrderByUsagePeriodDesc(String userId);

    /**
     * Find all usage for a specific period.
     */
    List<AIUserUsage> findByUsagePeriodOrderByTotalTokensDesc(String usagePeriod);

    /**
     * Get top users by token usage in a period.
     */
    @Query("SELECT u FROM AIUserUsage u WHERE u.usagePeriod = :period ORDER BY u.totalTokens DESC")
    List<AIUserUsage> findTopUsersByPeriod(String period, org.springframework.data.domain.Pageable pageable);

    /**
     * Get total tokens used in a period.
     */
    @Query("SELECT SUM(u.totalTokens) FROM AIUserUsage u WHERE u.usagePeriod = :period")
    Long getTotalTokensForPeriod(String period);

    /**
     * Get total estimated cost for a period.
     */
    @Query("SELECT SUM(u.estimatedCostUsd) FROM AIUserUsage u WHERE u.usagePeriod = :period")
    java.math.BigDecimal getTotalCostForPeriod(String period);

    /**
     * Get total request count for a period.
     */
    @Query("SELECT SUM(u.requestCount) FROM AIUserUsage u WHERE u.usagePeriod = :period")
    Long getTotalRequestsForPeriod(String period);

    /**
     * Check if user exists in period.
     */
    boolean existsByUserIdAndUsagePeriod(String userId, String usagePeriod);
}

