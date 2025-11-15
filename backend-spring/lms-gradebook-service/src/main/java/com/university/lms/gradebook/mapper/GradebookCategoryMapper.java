package com.university.lms.gradebook.mapper;

import com.university.lms.gradebook.domain.GradebookCategory;
import com.university.lms.gradebook.dto.CreateCategoryRequest;
import com.university.lms.gradebook.dto.GradebookCategoryDto;
import org.mapstruct.*;

/**
 * MapStruct mapper for GradebookCategory entity and DTOs.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface GradebookCategoryMapper {

    GradebookCategoryDto toDto(GradebookCategory category);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    GradebookCategory toEntity(CreateCategoryRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(CreateCategoryRequest request, @MappingTarget GradebookCategory category);
}

