package com.university.lms.plugin.runtime.web;

import com.university.lms.plugin.api.PluginType;
import com.university.lms.plugin.runtime.PluginStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Data transfer objects used by the plugin management REST API.
 *
 * <p>All records in this file are immutable value types. They are serialised to JSON by
 * Jackson for API responses and do not map directly to JPA entities.
 */
public final class PluginManagementDto {

    private PluginManagementDto() {}

    /**
     * Summary view of an installed plugin, returned by list and detail endpoints.
     *
     * @param pluginId    unique reverse-domain identifier
     * @param name        human-readable display name
     * @param version     semantic version string
     * @param description short plugin description
     * @param author      author or organisation
     * @param type        functional category
     * @param status      current lifecycle status
     * @param permissions permissions declared in the manifest
     * @param installedAt UTC timestamp of first installation
     * @param jarFileName filename of the plugin JAR as stored on the server, when available
     * @param runtime     identifier of the runtime/environment the plugin is loaded into
     */
    public record PluginDto(
            String pluginId,
            String name,
            String version,
            String description,
            String author,
            PluginType type,
            PluginStatus status,
            List<String> permissions,
            Instant installedAt,
            String jarFileName,
            String runtime
    ) {}

    /**
     * Response payload for enable and disable operations.
     *
     * @param pluginId  the affected plugin
     * @param newStatus the status after the operation
     * @param message   human-readable outcome description
     */
    public record PluginStatusResponse(
            String pluginId,
            PluginStatus newStatus,
            String message
    ) {}

    /**
     * Request body for updating plugin configuration.
     *
     * @param config key-value configuration entries to persist; existing keys not present here
     *               are left unchanged
     */
    public record UpdateConfigRequest(
            Map<String, String> config
    ) {}

    /**
     * Response body for config GET and PUT endpoints.
     *
     * @param pluginId the plugin whose config is returned
     * @param config   current persisted configuration snapshot
     */
    public record PluginConfigResponse(
            String pluginId,
            Map<String, String> config
    ) {}
}
