package com.university.lms.course.modules.dto;

import java.util.List;

public record CourseModulesResponse(
    List<CourseModuleDto> items
) {}
