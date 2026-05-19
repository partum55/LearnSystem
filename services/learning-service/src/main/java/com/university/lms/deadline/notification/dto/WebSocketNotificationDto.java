package com.university.lms.deadline.notification.dto;

public record WebSocketNotificationDto(
    Long deadlineId,
    String title,
    String courseCode,
    String dueAt,
    String type
) {}
