package com.university.lms.deadline.deadline.mapper;

import com.university.lms.deadline.deadline.dto.DeadlineDto;
import com.university.lms.deadline.deadline.entity.Deadline;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DeadlineMapper {

    DeadlineDto toDto(Deadline entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Deadline toEntity(DeadlineDto dto);
}

