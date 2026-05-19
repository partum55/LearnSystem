package com.university.lms.deadline.workload.mapper;

import com.university.lms.deadline.workload.dto.WorkloadSnapshotDto;
import com.university.lms.deadline.workload.entity.WorkloadSnapshot;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface WorkloadSnapshotMapper {
    WorkloadSnapshotDto toDto(WorkloadSnapshot entity);
}

