package com.university.lms.ai.web;

import com.university.lms.ai.domain.entity.AIUserUsage;
import com.university.lms.ai.dto.AIUsageSummaryResponse;
import com.university.lms.ai.dto.AIUsageStatsResponse;
import com.university.lms.ai.service.AICostTrackingService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.http.HttpStatus.FORBIDDEN;

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
    private final HttpServletRequest request;

    /**
     * Get current period usage for a specific user.
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AIUserUsage> getUserUsage(@PathVariable String userId) {
        enforceSelfOrAdmin(userId);
        Optional<AIUserUsage> usage = costTrackingService.getCurrentUsage(userId);
        return usage.map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Get current period usage for the authenticated user.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AIUserUsage> getMyUsage() {
        String userId = getAuthenticatedUserId().toString();
        Optional<AIUserUsage> usage = costTrackingService.getCurrentUsage(userId);
        return usage.map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Get usage history for a user.
     */
    @GetMapping("/user/{userId}/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AIUserUsage>> getUserHistory(@PathVariable String userId) {
        enforceSelfOrAdmin(userId);
        List<AIUserUsage> history = costTrackingService.getUserHistory(userId);
        return ResponseEntity.ok(history);
    }

    /**
     * Check if user has remaining quota.
     */
    @GetMapping("/user/{userId}/quota")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Boolean> hasRemainingQuota(@PathVariable String userId) {
        enforceSelfOrAdmin(userId);
        boolean hasQuota = costTrackingService.hasRemainingQuota(userId);
        return ResponseEntity.ok(hasQuota);
    }

    /**
     * Get remaining tokens for a user.
     */
    @GetMapping("/user/{userId}/remaining")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Long> getRemainingTokens(@PathVariable String userId) {
        enforceSelfOrAdmin(userId);
        long remaining = costTrackingService.getRemainingTokens(userId);
        return ResponseEntity.ok(remaining);
    }

    /**
     * Get system-wide usage summary for current period (admin only).
     */
    @GetMapping("/summary")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<AIUsageSummaryResponse> getSystemSummary() {
        AIUsageSummaryResponse summary = costTrackingService.getSystemSummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Get top users by usage for current period (admin only).
     */
    @GetMapping("/top-users")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<List<AIUserUsage>> getTopUsers(
            @RequestParam(defaultValue = "10") int limit) {
        List<AIUserUsage> topUsers = costTrackingService.getTopUsersCurrentPeriod(limit);
        return ResponseEntity.ok(topUsers);
    }

    /**
     * Get detailed usage statistics (admin only).
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<AIUsageStatsResponse> getUsageStats() {
        AIUsageStatsResponse stats = costTrackingService.getUsageStats();
        return ResponseEntity.ok(stats);
    }

    private UUID getAuthenticatedUserId() {
        Object userId = request.getAttribute("userId");
        if (userId instanceof UUID) {
            return (UUID) userId;
        }
        throw new IllegalStateException("User ID not available in request");
    }

    private void enforceSelfOrAdmin(String userId) {
        UUID authenticatedUserId = getAuthenticatedUserId();
        Object role = request.getAttribute("userRole");
        boolean isAdmin = role != null && "SUPERADMIN".equals(role.toString());
        if (!isAdmin && !authenticatedUserId.toString().equals(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        }
    }
}
