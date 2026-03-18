package com.university.lms.plugin.api;

/**
 * Declares a dependency on another installed plugin.
 *
 * <p>The plugin runtime enforces that the required plugin is present and satisfies the
 * minimum version constraint before the dependent plugin is enabled.
 *
 * @param pluginId   The unique reverse-domain identifier of the required plugin
 *                   (e.g. {@code "com.example.plagiarism-checker"}).
 * @param minVersion Minimum acceptable version string using semantic versioning
 *                   (e.g. {@code "1.2.0"}).
 */
public record PluginDependency(String pluginId, String minVersion) {}
