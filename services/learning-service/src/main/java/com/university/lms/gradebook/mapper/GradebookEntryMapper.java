package com.university.lms.gradebook.mapper;

import com.university.lms.gradebook.domain.GradebookEntry;
import com.university.lms.gradebook.dto.GradebookEntryDto;
import org.mapstruct.*;

/**
 * MapStruct mapper for GradebookEntry entity and DTOs.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface GradebookEntryMapper {

    @Mapping(source = "late", target = "late")
    @Mapping(source = "excused", target = "excused")
    @Mapping(target = "finalScore", expression = "java(entry.getFinalScore())")
    @Mapping(target = "studentName", ignore = true)
    @Mapping(target = "studentEmail", ignore = true)
    @Mapping(target = "assignmentTitle", ignore = true)
    GradebookEntryDto toDto(GradebookEntry entry);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "percentage", ignore = true)
    GradebookEntry toEntity(GradebookEntryDto dto);
}

