package com.university.lms.course.assignments.dto;

import java.util.List;
import java.util.Map;

public record FormAssignmentSettingsDto(
    List<Map<String, Object>> fields,
    Boolean allowEditAfterSubmit,
    Boolean allowResubmission
) {}
