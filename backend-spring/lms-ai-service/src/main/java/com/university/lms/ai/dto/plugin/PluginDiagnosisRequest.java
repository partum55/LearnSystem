package com.university.lms.ai.dto.plugin;

public record PluginDiagnosisRequest(
    String symptoms,
    Integer recentLogLines
) {}
