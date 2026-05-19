package com.university.lms.ai.dto.plugin;

import java.util.Map;

public record PluginConfigSuggestionResponse(
    String pluginId,
    Map<String, String> suggestedConfig,
    String reasoning
) {}
