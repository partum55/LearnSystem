package com.university.lms.ai.web;

import com.university.lms.ai.domain.entity.AIUserUsage;
import com.university.lms.ai.dto.AIUsageSummaryResponse;
import com.university.lms.ai.dto.AIUsageStatsResponse;
import com.university.lms.ai.service.AICostTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * REST controller for AI usage and cost tracking.
 * Provides endpoints for users to view their AI usage and for admins to view system-wide statistics.
 */
@RestController
@RequestMapping("/v1/ai/usage")
@RequiredArgsConstructor
@Slf4j
public class AIUsageController {

    private final AICostTrackingService costTrackingService;

    /**
     * Get current period usage for a specific user.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<AIUserUsage> getUserUsage(@PathVariable String userId) {
        Optional<AIUserUsage> usage = costTrackingService.getCurrentUsage(userId);
        return usage.map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Get current period usage for the authenticated user.
     */
    @GetMapping("/me")
    public ResponseEntity<AIUserUsage> getMyUsage(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        Optional<AIUserUsage> usage = costTrackingService.getCurrentUsage(userId);
        return usage.map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Get usage history for a user.
     */
    @GetMapping("/user/{userId}/history")
    public ResponseEntity<List<AIUserUsage>> getUserHistory(@PathVariable String userId) {
        List<AIUserUsage> history = costTrackingService.getUserHistory(userId);
        return ResponseEntity.ok(history);
    }

    /**
     * Check if user has remaining quota.
     */
    @GetMapping("/user/{userId}/quota")
    public ResponseEntity<Boolean> hasRemainingQuota(@PathVariable String userId) {
        boolean hasQuota = costTrackingService.hasRemainingQuota(userId);
        return ResponseEntity.ok(hasQuota);
    }

    /**
     * Get remaining tokens for a user.
     */
    @GetMapping("/user/{userId}/remaining")
    public ResponseEntity<Long> getRemainingTokens(@PathVariable String userId) {
        long remaining = costTrackingService.getRemainingTokens(userId);
        return ResponseEntity.ok(remaining);
    }

    /**
     * Get system-wide usage summary for current period (admin only).
     */
    @GetMapping("/summary")
    public ResponseEntity<AIUsageSummaryResponse> getSystemSummary() {
        AIUsageSummaryResponse summary = costTrackingService.getSystemSummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Get top users by usage for current period (admin only).
     */
    @GetMapping("/top-users")
    public ResponseEntity<List<AIUserUsage>> getTopUsers(
            @RequestParam(defaultValue = "10") int limit) {
        List<AIUserUsage> topUsers = costTrackingService.getTopUsersCurrentPeriod(limit);
        return ResponseEntity.ok(topUsers);
    }

    /**
     * Get detailed usage statistics (admin only).
     */
    @GetMapping("/stats")
    public ResponseEntity<AIUsageStatsResponse> getUsageStats() {
        AIUsageStatsResponse stats = costTrackingService.getUsageStats();
        return ResponseEntity.ok(stats);
    }
}

