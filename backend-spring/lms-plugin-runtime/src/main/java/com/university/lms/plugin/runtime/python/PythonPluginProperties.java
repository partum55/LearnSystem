package com.university.lms.plugin.runtime.python;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for the Python sidecar plugin runtime.
 *
 * @param enabled                  whether Python plugin support is active
 * @param executable               path or name of the Python interpreter
 * @param portRangeStart           first port in the allocation range for sidecar processes
 * @param portRangeEnd             last port (exclusive) in the allocation range
 * @param healthCheckTimeoutSeconds max seconds to wait for a sidecar's health endpoint
 * @param venvEnabled              whether to create a virtualenv per plugin
 * @param installTimeoutSeconds    max seconds for pip install
 */
@ConfigurationProperties(prefix = "plugin.python")
public record PythonPluginProperties(
        boolean enabled,
        String executable,
        int portRangeStart,
        int portRangeEnd,
        int healthCheckTimeoutSeconds,
        boolean venvEnabled,
        int installTimeoutSeconds
) {

    public PythonPluginProperties {
        if (executable == null || executable.isBlank()) {
            executable = "python3";
        }
        if (portRangeStart <= 0) portRangeStart = 9100;
        if (portRangeEnd <= 0) portRangeEnd = 9200;
        if (healthCheckTimeoutSeconds <= 0) healthCheckTimeoutSeconds = 30;
        if (installTimeoutSeconds <= 0) installTimeoutSeconds = 120;
    }

    public PythonPluginProperties() {
        this(true, "python3", 9100, 9200, 30, true, 120);
    }
}
