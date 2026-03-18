package com.university.lms.ai.dto.plugin;

public record PluginGenerationResponse(
    String pluginId,
    String pluginName,
    String pluginJson,
    String mainPy,
    String requirementsTxt
) {}
