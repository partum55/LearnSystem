package com.university.lms.ai.dto.plugin;

import java.util.List;

public record PluginGenerationRequest(
    String description,
    String pluginType,
    String pluginName,
    String pluginId,
    List<String> permissions,
    String language,
    String additionalDetails
) {}
