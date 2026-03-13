package com.university.lms.ai.dto.plugin;

import java.util.List;

public record PluginDiagnosisResponse(
    String pluginId,
    String rootCause,
    List<String> suggestedFixes,
    String severity,
    String explanation
) {}
