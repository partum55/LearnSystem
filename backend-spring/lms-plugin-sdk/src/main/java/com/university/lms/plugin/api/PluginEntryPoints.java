package com.university.lms.plugin.api;

/**
 * Locators for the plugin's backend class and optional frontend assets.
 *
 * <p>The plugin runtime uses these values to wire the plugin into the host application:
 * the backend class is instantiated via reflection, the frontend bundle is served under the
 * plugin's static asset path, and the settings route is registered in the admin UI.
 *
 * @param backendClass   Fully-qualified class name of the class that implements {@link LmsPlugin}
 *                       (e.g. {@code "com.example.plagiarism.PlagiarismPlugin"}).
 * @param frontendEntry  Relative path (within the plugin jar's {@code static/} directory) to the
 *                       compiled frontend JS bundle (e.g. {@code "dist/plugin.js"}).
 *                       May be {@code null} for backend-only plugins.
 * @param settingsRoute  Optional SPA route fragment for the plugin settings page
 *                       (e.g. {@code "/settings/plagiarism"}). {@code null} if the plugin has no
 *                       settings UI.
 */
public record PluginEntryPoints(
        String backendClass,
        String frontendEntry,
        String settingsRoute
) {}
