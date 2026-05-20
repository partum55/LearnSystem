package com.university.lms.course.modules.dto;

import com.university.lms.course.assignments.dto.AssignmentListItemDto;
import com.university.lms.course.materials.dto.LearningItemDto;
import java.util.List;
import java.util.UUID;

public record CourseModuleDto(
    UUID id,
    String title,
    String description,
    int order,
    String availabilityStatus,
    List<LearningItemDto> learningItems,
    List<AssignmentListItemDto> assignments
) {}
