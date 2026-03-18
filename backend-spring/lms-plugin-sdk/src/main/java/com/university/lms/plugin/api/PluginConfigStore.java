package com.university.lms.plugin.api;

import java.util.Map;
import java.util.Optional;

/**
 * Key-value configuration store scoped to the plugin.
 *
 * <p>Configuration entries are persisted in the LMS database under the plugin's namespace and
 * survive restarts. Use this store for administrator-supplied settings (API keys, thresholds,
 * feature flags, etc.) rather than hard-coding values.
 *
 * <p>All operations are synchronous and transactional. Keys are case-sensitive plain strings;
 * values are stored as UTF-8 text. Sensitive values (passwords, tokens) should be encrypted
 * by the caller before storage.
 */
public interface PluginConfigStore {

    /**
     * Returns the value associated with {@code key}, or {@link Optional#empty()} if the key has
     * not been set.
     */
    Optional<String> get(String key);

    /**
     * Persists or overwrites the value for {@code key}.
     *
     * @param key   non-null, non-blank config key
     * @param value non-null string value; pass an empty string to clear semantically
     */
    void set(String key, String value);

    /**
     * Removes the entry for {@code key}. No-op if the key does not exist.
     */
    void remove(String key);

    /**
     * Returns an unmodifiable snapshot of all config entries for this plugin.
     */
    Map<String, String> getAll();
}
