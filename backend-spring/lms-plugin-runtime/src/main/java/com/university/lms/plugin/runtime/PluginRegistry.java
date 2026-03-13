package com.university.lms.plugin.runtime;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Central, thread-safe registry of all plugins known to the runtime.
 *
 * <p>The {@link PluginLoader} populates this registry at startup after each plugin has been
 * validated, schema-initialised, and lifecycle-called. Other components (sandbox, management
 * controller, event bus) query the registry to resolve plugins by id.
 *
 * <p>All methods are safe to call from any thread without external synchronisation.
 */
@Component
@Slf4j
public class PluginRegistry {

    private final ConcurrentHashMap<String, PluginRegistration> plugins = new ConcurrentHashMap<>();

    /**
     * Adds or replaces the registration for the plugin identified by
     * {@link PluginRegistration#manifest()#id()}.
     *
     * @param registration the new or updated registration; must not be {@code null}
     */
    public void register(PluginRegistration registration) {
        String id = registration.manifest().id();
        plugins.put(id, registration);
        log.debug("Registered plugin '{}' with status {}", id, registration.status());
    }

    /**
     * Removes the plugin with the given id from the registry.
     *
     * <p>No-op if the id is not currently registered.
     *
     * @param pluginId the unique plugin identifier
     */
    public void unregister(String pluginId) {
        PluginRegistration removed = plugins.remove(pluginId);
        if (removed != null) {
            log.debug("Unregistered plugin '{}'", pluginId);
        }
    }

    /**
     * Returns the registration for the given plugin id, or {@link Optional#empty()} if not found.
     *
     * @param pluginId the unique plugin identifier
     */
    public Optional<PluginRegistration> get(String pluginId) {
        return Optional.ofNullable(plugins.get(pluginId));
    }

    /**
     * Returns an unmodifiable snapshot of all registered plugins, regardless of status.
     */
    public Collection<PluginRegistration> getAll() {
        return Collections.unmodifiableCollection(plugins.values());
    }

    /**
     * Returns an unmodifiable snapshot of only those plugins whose status is {@link PluginStatus#ENABLED}.
     */
    public Collection<PluginRegistration> getEnabled() {
        return plugins.values().stream()
                .filter(r -> r.status() == PluginStatus.ENABLED)
                .toList();
    }

    /**
     * Returns {@code true} if a plugin with the given id is currently registered (any status).
     *
     * @param pluginId the unique plugin identifier
     */
    public boolean isRegistered(String pluginId) {
        return plugins.containsKey(pluginId);
    }
}
