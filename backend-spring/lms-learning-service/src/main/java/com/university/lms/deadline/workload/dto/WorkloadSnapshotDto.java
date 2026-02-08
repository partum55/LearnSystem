package com.university.lms.deadline.workload.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class WorkloadSnapshotDto {
    Long id;
    Long studentId;
    LocalDate date;
    Integer totalEffort;
}

