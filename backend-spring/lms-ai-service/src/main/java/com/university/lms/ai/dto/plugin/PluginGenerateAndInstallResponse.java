package com.university.lms.ai.dto.plugin;

public record PluginGenerateAndInstallResponse(
    String pluginId,
    String pluginName,
    String pluginJson,
    String mainPy,
    String requirementsTxt,
    boolean installed,
    String installMessage
) {}
