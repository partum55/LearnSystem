package com.university.lms.deadline.notification.scheduler;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import com.university.lms.deadline.notification.service.NotificationService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationSchedulerTest {

  @Mock private DeadlineRepository deadlineRepository;
  @Mock private NotificationService notificationService;

  @InjectMocks private NotificationScheduler scheduler;

  @Test
  void dispatchNotificationsShouldDispatchForAllStudentGroups() {
    when(deadlineRepository.findDistinctStudentGroupIds()).thenReturn(List.of(1L, 2L, 3L));

    scheduler.dispatchNotifications();

    verify(notificationService).dispatchDueSoon(1L);
    verify(notificationService).dispatchDueSoon(2L);
    verify(notificationService).dispatchDueSoon(3L);
  }

  @Test
  void dispatchNotificationsShouldContinueWhenOneGroupFails() {
    when(deadlineRepository.findDistinctStudentGroupIds()).thenReturn(List.of(7L, 8L));
    doThrow(new IllegalStateException("dispatch failure"))
        .when(notificationService)
        .dispatchDueSoon(7L);

    scheduler.dispatchNotifications();

    verify(notificationService).dispatchDueSoon(7L);
    verify(notificationService).dispatchDueSoon(8L);
  }

  @Test
  void dispatchNotificationsShouldSkipWhenNoGroupsFound() {
    when(deadlineRepository.findDistinctStudentGroupIds()).thenReturn(List.of());

    scheduler.dispatchNotifications();

    verifyNoInteractions(notificationService);
  }
}
