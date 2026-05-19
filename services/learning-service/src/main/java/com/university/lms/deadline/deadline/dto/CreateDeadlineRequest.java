package com.university.lms.deadline.deadline.dto;

import com.university.lms.deadline.deadline.entity.DeadlineType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;

@Value
@Builder
public class CreateDeadlineRequest {
    @NotNull Long courseId;
    @NotNull Long studentGroupId;
    @NotNull String title;
    String description;
    @NotNull OffsetDateTime dueAt;
    @Positive Integer estimatedEffort;
    @NotNull DeadlineType type;
}

