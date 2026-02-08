package com.university.lms.deadline.notification.service;

import com.university.lms.deadline.deadline.entity.Deadline;
import com.university.lms.deadline.deadline.repository.DeadlineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@Slf4j
public class NotificationService {

    private final DeadlineRepository deadlineRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public NotificationService(DeadlineRepository deadlineRepository, SimpMessagingTemplate messagingTemplate) {
        this.deadlineRepository = deadlineRepository;
        this.messagingTemplate = messagingTemplate;
    }

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
        if (mailSender == null) {
            log.debug("Mail sender not configured, skipping email for deadline: {}", deadline.getTitle());
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo("student+" + deadline.getStudentGroupId() + "@lms.edu");
            message.setSubject("Upcoming deadline: " + deadline.getTitle());
            message.setText("Deadline due at " + deadline.getDueAt());
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Failed to send email for deadline {}: {}", deadline.getTitle(), e.getMessage());
        }
    }

    private void sendWebsocket(Deadline deadline) {
        messagingTemplate.convertAndSend(
                "/topic/deadlines/" + deadline.getStudentGroupId(),
                deadline.getTitle());
    }
}

