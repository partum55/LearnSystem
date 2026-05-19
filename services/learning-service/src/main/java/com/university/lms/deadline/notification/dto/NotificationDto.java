package com.university.lms.deadline.notification.dto;

import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;

@Value
@Builder
public class NotificationDto {
    Long deadlineId;
    Long studentId;
    OffsetDateTime sendAt;
    String channel;
    String message;
}

