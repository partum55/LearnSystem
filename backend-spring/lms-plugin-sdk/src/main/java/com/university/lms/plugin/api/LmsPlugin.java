package com.university.lms.plugin.api;

/**
 * Root interface that every LMS plugin must implement.
 *
 * <p>A plugin is a self-contained extension unit loaded by the plugin runtime. The runtime
 * calls the lifecycle methods below at the appropriate points; all methods receive a
 * {@link PluginContext} that gives controlled access to LMS data and services.
 *
 * <p>All lifecycle methods have empty default implementations so that plugin authors only need
 * to override the hooks they actually use.
 *
 * <h3>Lifecycle order</h3>
 * <ol>
 *   <li>{@link #onInstall}  — called once when the plugin is first installed</li>
 *   <li>{@link #onEnable}   — called each time the plugin is activated (including after restart)</li>
 *   <li>{@link #onDisable}  — called when the plugin is deactivated or the LMS shuts down</li>
 *   <li>{@link #onUninstall}— called once when the plugin is permanently removed</li>
 * </ol>
 *
 * <h3>Thread safety</h3>
 * <p>Lifecycle methods are called sequentially by the runtime; implementations are not required
 * to be thread-safe with respect to each other. However, event handlers registered via
 * {@link PluginEventBus} may fire concurrently and must be thread-safe.
 */
public interface LmsPlugin {

    /**
     * Returns the plugin's immutable descriptor.
     *
     * <p>The runtime reads the manifest before instantiation (via a static factory or annotation),
     * but also calls this method post-construction to cross-check identity and permissions.
     * Implementations must return the same instance on every call.
     */
    PluginManifest getManifest();

    /**
     * Called once when the plugin is first installed into the LMS.
     *
     * <p>Use this hook to create database tables (via {@link PluginContext#dataStore()}),
     * register default configuration values, or perform any other one-time setup. Throwing an
     * exception aborts installation and prevents the plugin from being enabled.
     *
     * @param context runtime context for this plugin
     */
    default void onInstall(PluginContext context) {}

    /**
     * Called each time the plugin is activated, including on every LMS startup when the
     * plugin is already installed and enabled.
     *
     * <p>Use this hook to register event subscriptions, start background tasks, or warm
     * caches. Throwing an exception prevents the plugin from becoming active.
     *
     * @param context runtime context for this plugin
     */
    default void onEnable(PluginContext context) {}

    /**
     * Called when the plugin is deactivated, either explicitly by an administrator or as part
     * of an orderly LMS shutdown.
     *
     * <p>Use this hook to cancel background tasks and release external resources. Exceptions are
     * logged but do not prevent the disable from completing.
     *
     * @param context runtime context for this plugin
     */
    default void onDisable(PluginContext context) {}

    /**
     * Called once when the plugin is permanently removed from the LMS.
     *
     * <p>Use this hook to drop database tables or clean up any persistent state that should
     * not outlive the plugin. The plugin's config store entries are wiped automatically after
     * this method returns.
     *
     * @param context runtime context for this plugin
     */
    default void onUninstall(PluginContext context) {}
}
