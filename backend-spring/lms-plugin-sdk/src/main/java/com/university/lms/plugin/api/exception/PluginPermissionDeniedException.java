package com.university.lms.plugin.api.exception;

import java.util.Arrays;
import java.util.List;

/**
 * Thrown when a plugin attempts to access an LMS service or execute a method that requires
 * a permission scope not declared in the plugin's manifest.
 *
 * <p>The runtime raises this exception before any protected logic executes, so partial
 * side-effects are not a concern. Plugin authors should ensure all required scopes are listed
 * in {@link com.university.lms.plugin.api.PluginManifest#permissions()} to avoid this exception
 * at runtime.
 *
 * <p>The exception message always includes the plugin id and the missing scope(s) to aid
 * diagnostics in the admin console.
 */
public class PluginPermissionDeniedException extends PluginException {

    private final List<String> requiredPermissions;

    /**
     * Constructs the exception with a single missing permission scope.
     *
     * @param pluginId           the id of the plugin that attempted the forbidden access
     * @param requiredPermission the scope that was required but not declared
     */
    public PluginPermissionDeniedException(String pluginId, String requiredPermission) {
        super("Plugin '%s' requires permission '%s' which is not declared in its manifest."
                .formatted(pluginId, requiredPermission));
        this.requiredPermissions = List.of(requiredPermission);
    }

    /**
     * Constructs the exception when multiple scopes are simultaneously required but missing.
     *
     * @param pluginId            the id of the plugin that attempted the forbidden access
     * @param requiredPermissions the scopes that were required but not all declared
     */
    public PluginPermissionDeniedException(String pluginId, String... requiredPermissions) {
        super("Plugin '%s' requires permissions %s which are not all declared in its manifest."
                .formatted(pluginId, Arrays.toString(requiredPermissions)));
        this.requiredPermissions = List.of(requiredPermissions);
    }

    /**
     * Constructs the exception with an explicit detail message and the missing permissions list.
     *
     * @param message             custom detail message
     * @param requiredPermissions the scopes involved in the denial
     */
    public PluginPermissionDeniedException(String message, List<String> requiredPermissions) {
        super(message);
        this.requiredPermissions = List.copyOf(requiredPermissions);
    }

    /**
     * Returns an unmodifiable list of the permission scopes that triggered this denial.
     */
    public List<String> getRequiredPermissions() {
        return requiredPermissions;
    }
}
