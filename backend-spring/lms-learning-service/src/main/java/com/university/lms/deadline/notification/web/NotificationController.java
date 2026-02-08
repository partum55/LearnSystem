package com.university.lms.deadline.notification.web;

import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import com.university.lms.deadline.notification.dto.NotificationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for notification-related endpoints.
 * Provides endpoints for fetching upcoming deadline notifications.
 */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final DeadlineRepository deadlineRepository;

    /**
     * Get all upcoming deadline notifications for the authenticated user.
     * Returns deadlines due within the next 7 days.
     */
    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications() {
        log.debug("Fetching notifications for upcoming deadlines");

        // For now, return all deadlines due in the next 7 days as notifications
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime weekFromNow = now.plusDays(7);

        try {
            // Try to get upcoming deadlines
            List<Deadline> upcomingDeadlines = deadlineRepository.findByDueAtBetween(now, weekFromNow);

            List<NotificationDto> notifications = upcomingDeadlines.stream()
                    .map(deadline -> NotificationDto.builder()
                            .deadlineId(deadline.getId())
                            .studentId(deadline.getStudentGroupId())
                            .sendAt(deadline.getDueAt().minusHours(24))
                            .channel("WEB")
                            .message("Upcoming deadline: " + deadline.getTitle() + " due at " + deadline.getDueAt())
                            .build())
                    .collect(Collectors.toList());

            log.debug("Found {} upcoming notifications", notifications.size());
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            log.warn("Error fetching notifications: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * Get notification count for the authenticated user.
     */
    @GetMapping("/count")
    public ResponseEntity<Long> getNotificationCount() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime weekFromNow = now.plusDays(7);

        try {
            long count = deadlineRepository.countByDueAtBetween(now, weekFromNow);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.warn("Error counting notifications: {}", e.getMessage());
            return ResponseEntity.ok(0L);
        }
    }
}
