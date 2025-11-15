package com.university.lms.gradebook.mapper;

import com.university.lms.gradebook.domain.GradeHistory;
import com.university.lms.gradebook.dto.GradeHistoryDto;
import org.mapstruct.*;

/**
 * MapStruct mapper for GradeHistory entity and DTOs.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface GradeHistoryMapper {

    @Mapping(source = "gradebookEntry.id", target = "gradebookEntryId")
    @Mapping(target = "changedByName", ignore = true)
    GradeHistoryDto toDto(GradeHistory history);
}

