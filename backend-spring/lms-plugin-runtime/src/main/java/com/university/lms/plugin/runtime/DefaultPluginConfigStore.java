package com.university.lms.plugin.runtime;

import com.university.lms.plugin.api.PluginConfigStore;
import com.university.lms.plugin.runtime.entity.InstalledPlugin;
import com.university.lms.plugin.runtime.repository.InstalledPluginRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Persists plugin configuration as key-value pairs in the {@code installed_plugins.config}
 * JSONB column.
 *
 * <p>Each instance is scoped to a single plugin identified by {@code pluginId}. Reads and
 * writes are delegated to {@link InstalledPluginRepository}. The config map is lazily loaded
 * from the database on first access and written back synchronously on each mutation.
 *
 * <p>Thread safety: this class is not thread-safe with respect to concurrent modification from
 * different threads. The plugin lifecycle guarantees sequential access from the runtime; if a
 * plugin delegates to multiple threads it must synchronise externally.
 */
@RequiredArgsConstructor
@Slf4j
public class DefaultPluginConfigStore implements PluginConfigStore {

    private final String pluginId;
    private final InstalledPluginRepository repository;

    @Override
    public Optional<String> get(String key) {
        return Optional.ofNullable(loadConfig().get(key));
    }

    @Override
    public void set(String key, String value) {
        InstalledPlugin entity = requireEntity();
        Map<String, String> config = mutableConfig(entity);
        config.put(key, value);
        entity.setConfig(config);
        repository.save(entity);
        log.debug("Set config key '{}' for plugin '{}'", key, pluginId);
    }

    @Override
    public void remove(String key) {
        InstalledPlugin entity = requireEntity();
        Map<String, String> config = mutableConfig(entity);
        if (config.remove(key) != null) {
            entity.setConfig(config);
            repository.save(entity);
            log.debug("Removed config key '{}' for plugin '{}'", key, pluginId);
        }
    }

    @Override
    public Map<String, String> getAll() {
        return Collections.unmodifiableMap(loadConfig());
    }

    // --- helpers ---

    private Map<String, String> loadConfig() {
        return repository.findByPluginId(pluginId)
                .map(InstalledPlugin::getConfig)
                .map(c -> c != null ? c : Collections.<String, String>emptyMap())
                .orElse(Collections.emptyMap());
    }

    private InstalledPlugin requireEntity() {
        return repository.findByPluginId(pluginId)
                .orElseThrow(() -> new IllegalStateException(
                        "No installed_plugins row found for plugin '%s'".formatted(pluginId)));
    }

    private static Map<String, String> mutableConfig(InstalledPlugin entity) {
        Map<String, String> existing = entity.getConfig();
        return existing != null ? new HashMap<>(existing) : new HashMap<>();
    }
}
