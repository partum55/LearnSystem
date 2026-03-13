package com.university.lms.plugin.runtime;

/**
 * Lifecycle state of a plugin within the runtime.
 *
 * <ul>
 *   <li>{@link #ENABLED}  — loaded, initialised, and actively handling events</li>
 *   <li>{@link #DISABLED} — installed but not currently active; can be re-enabled</li>
 *   <li>{@link #ERROR}    — encountered a fatal error during load, install, or enable; admin intervention required</li>
 * </ul>
 */
public enum PluginStatus {
    ENABLED,
    DISABLED,
    ERROR
}
