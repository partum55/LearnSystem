package com.university.lms.deadline.conflict.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.util.List;

@Value
@Builder
public class ConflictDto {
    LocalDate date;
    String type;
    String message;
    List<Long> deadlineIds;
}

