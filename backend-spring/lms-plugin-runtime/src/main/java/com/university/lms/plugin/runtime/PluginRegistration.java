package com.university.lms.plugin.runtime;

import com.university.lms.plugin.api.LmsPlugin;
import com.university.lms.plugin.api.PluginManifest;

import java.net.URLClassLoader;
import java.nio.file.Path;
import java.util.List;

/**
 * Immutable snapshot of a plugin entry in the {@link PluginRegistry}.
 *
 * @param plugin              the live {@link LmsPlugin} instance
 * @param manifest            the manifest read from the plugin JAR's {@code plugin.json}
 * @param status              current lifecycle state of the plugin
 * @param classLoader         the {@link URLClassLoader} used to load the plugin JAR (null for classpath plugins)
 * @param controllerInstances instantiated {@code @PluginController} classes for dynamic route registration
 * @param jarPath             filesystem path to the plugin JAR file (null for classpath plugins)
 */
public record PluginRegistration(
        LmsPlugin plugin,
        PluginManifest manifest,
        PluginStatus status,
        URLClassLoader classLoader,
        List<Object> controllerInstances,
        Path jarPath
) {

    /**
     * Compact constructor for backward compatibility (classpath-loaded plugins).
     */
    public PluginRegistration(LmsPlugin plugin, PluginManifest manifest, PluginStatus status) {
        this(plugin, manifest, status, null, List.of(), null);
    }

    /**
     * Returns a copy of this registration with the given status.
     */
    public PluginRegistration withStatus(PluginStatus newStatus) {
        return new PluginRegistration(plugin, manifest, newStatus, classLoader, controllerInstances, jarPath);
    }
}
