package com.university.lms.plugin.runtime.python;

import com.university.lms.plugin.api.LmsPlugin;
import com.university.lms.plugin.api.PluginContext;
import com.university.lms.plugin.api.PluginManifest;

/**
 * Thin adapter allowing Python sidecar plugins to be registered in the
 * Java {@link com.university.lms.plugin.runtime.PluginRegistry}.
 * All lifecycle methods are no-ops — real lifecycle is managed via HTTP calls
 * to the Python sidecar process.
 */
public class PythonPluginAdapter implements LmsPlugin {

    private final String pluginId;
    private final PluginManifest manifest;

    public PythonPluginAdapter(String pluginId, PluginManifest manifest) {
        this.pluginId = pluginId;
        this.manifest = manifest;
    }

    @Override
    public PluginManifest getManifest() {
        return manifest;
    }

    @Override
    public void onInstall(PluginContext context) {
        // no-op: lifecycle managed via HTTP bridge
    }

    @Override
    public void onEnable(PluginContext context) {
        // no-op: lifecycle managed via HTTP bridge
    }

    @Override
    public void onDisable(PluginContext context) {
        // no-op: lifecycle managed via HTTP bridge
    }

    @Override
    public void onUninstall(PluginContext context) {
        // no-op: lifecycle managed via HTTP bridge
    }
}
