package com.university.lms.deadline.deadline.dto;

import com.university.lms.deadline.deadline.entity.DeadlineType;
import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;

@Value
@Builder
public class DeadlineDto {
    Long id;
    Long courseId;
    Long studentGroupId;
    String title;
    String description;
    OffsetDateTime dueAt;
    Integer estimatedEffort;
    DeadlineType type;
}

