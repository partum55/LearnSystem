package com.university.lms.deadline.notification.scheduler;

import com.university.lms.deadline.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private final NotificationService notificationService;

    @Scheduled(cron = "${notification.dispatch.cron:0 */15 * * * *}")
    public void dispatchNotifications() {
        // TODO: fetch actual student groups; placeholder 1L for scaffolding
        notificationService.dispatchDueSoon(1L);
        log.debug("Notification scheduler executed");
    }
}

