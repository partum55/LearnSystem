package com.university.lms.plugin.api;

import java.util.List;

/**
 * Immutable descriptor that identifies a plugin and declares everything the runtime needs to
 * load, version-check, and permission-gate it.
 *
 * <p>Plugin authors supply one {@code PluginManifest} instance from their {@link LmsPlugin}
 * implementation. The runtime reads the manifest at install time and again at each startup.
 *
 * @param id            Reverse-domain unique identifier (e.g. {@code "com.example.plagiarism-checker"}).
 *                      Must be stable across versions; changing it creates a new plugin identity.
 * @param name          Human-readable display name shown in the Plugin Marketplace UI.
 * @param version       Semantic version string (e.g. {@code "2.1.0"}).
 * @param description   Short (one or two sentence) description of the plugin's purpose.
 * @param author        Plugin author or organisation name.
 * @param minLmsVersion Minimum LMS version required to run this plugin (e.g. {@code "1.0.0"}).
 * @param type          Functional category; see {@link PluginType}.
 * @param permissions   Scopes the plugin needs at runtime (e.g. {@code ["courses.read", "submissions.read"]}).
 *                      The runtime denies access to any {@link PluginContext} service method that
 *                      requires a scope not listed here.
 * @param dependencies  Other plugins that must be installed and active before this one starts.
 * @param entryPoints   Locators for the backend class and optional frontend assets.
 * @param runtime       Optional execution runtime identifier (e.g. {@code "java"}, {@code "python"}).
 *                      If {@code null} or omitted, the runtime defaults to {@code "java"}.
 */
public record PluginManifest(
        String id,
        String name,
        String version,
        String description,
        String author,
        String minLmsVersion,
        PluginType type,
        List<String> permissions,
        List<PluginDependency> dependencies,
        PluginEntryPoints entryPoints,
        String runtime
) {

    /**
     * Returns the resolved runtime, defaulting to {@code "java"} when not specified.
     */
    public String resolvedRuntime() {
        return runtime != null ? runtime : "java";
    }
}
