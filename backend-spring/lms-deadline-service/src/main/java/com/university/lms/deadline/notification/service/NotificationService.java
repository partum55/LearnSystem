package com.university.lms.deadline.notification.service;

import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final DeadlineRepository deadlineRepository;
    private final JavaMailSender mailSender;
    private final SimpMessagingTemplate messagingTemplate;

    public void dispatchDueSoon(Long studentGroupId) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime window = now.plusHours(48);
        List<Deadline> upcoming = deadlineRepository.findByStudentGroupIdAndDueAtBetween(studentGroupId, now, window);

        for (Deadline deadline : upcoming) {
            sendEmail(deadline);
            sendWebsocket(deadline);
        }
        log.info("Dispatched {} notifications for group {}", upcoming.size(), studentGroupId);
    }

    private void sendEmail(Deadline deadline) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo("student+" + deadline.getStudentGroupId() + "@lms.edu");
        message.setSubject("Upcoming deadline: " + deadline.getTitle());
        message.setText("Deadline due at " + deadline.getDueAt());
        mailSender.send(message);
    }

    private void sendWebsocket(Deadline deadline) {
        messagingTemplate.convertAndSend(
                "/topic/deadlines/" + deadline.getStudentGroupId(),
                deadline.getTitle());
    }
}

