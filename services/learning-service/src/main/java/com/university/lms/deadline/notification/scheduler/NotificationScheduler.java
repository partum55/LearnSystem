package com.university.lms.deadline.notification.scheduler;

import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import com.university.lms.deadline.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private final DeadlineRepository deadlineRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "${notification.dispatch.cron:0 */15 * * * *}")
    public void dispatchNotifications() {
        List<Long> studentGroupIds = deadlineRepository.findDistinctStudentGroupIds();

        if (studentGroupIds.isEmpty()) {
            log.debug("Notification scheduler skipped: no student groups with deadlines");
            return;
        }

        int processedGroups = 0;
        for (Long studentGroupId : studentGroupIds) {
            try {
                notificationService.dispatchDueSoon(studentGroupId);
                processedGroups++;
            } catch (Exception exception) {
                log.warn(
                        "Failed to dispatch notifications for group {}: {}",
                        studentGroupId,
                        exception.getMessage(),
                        exception);
            }
        }

        log.info(
                "Notification scheduler executed for {} of {} student groups",
                processedGroups,
                studentGroupIds.size());
    }
}
