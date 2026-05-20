package com.university.lms.course.assignments.dto;

import java.util.List;
import java.util.Map;

public record VplAssignmentSettingsDto(
    String language,
    String runtime,
    String templateCode,
    List<Map<String, Object>> visibleTests,
    String hiddenTestsReference,
    Integer timeLimit,
    Integer memoryLimit,
    String gradingMode
) {}
