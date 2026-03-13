package com.university.lms.ai.dto.plugin;

import java.util.Map;

public record PluginConfigSuggestionRequest(
    String goal,
    Map<String, String> currentConfig
) {}
