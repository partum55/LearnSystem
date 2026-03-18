package com.university.lms.plugin.runtime.python;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Orchestrates all Python sidecar plugin processes.
 *
 * <p>Handles port allocation, process startup with health-check polling,
 * graceful shutdown, and periodic liveness monitoring.
 */
@Component
@Slf4j
public class PythonProcessManager {

    private final PythonPluginProperties properties;
    private final RestClient restClient;
    private final AtomicInteger nextPort;
    private final ConcurrentHashMap<String, PythonPluginProcess> processes = new ConcurrentHashMap<>();

    public PythonProcessManager(PythonPluginProperties properties) {
        this.properties = properties;
        this.nextPort = new AtomicInteger(properties.portRangeStart());
        this.restClient = RestClient.create();
    }

    /**
     * Starts a Python plugin process, waits for it to become healthy.
     *
     * @param pluginId   unique plugin identifier
     * @param extractDir directory containing main.py and .venv
     * @param envVars    environment variables to pass to the process
     * @return the allocated port
     */
    public int startPlugin(String pluginId, Path extractDir, Map<String, String> envVars) throws Exception {
        if (processes.containsKey(pluginId)) {
            throw new IllegalStateException("Plugin '" + pluginId + "' process is already running");
        }

        int port = allocatePort();
        Map<String, String> env = new java.util.HashMap<>(envVars);
        env.put("PLUGIN_ID", pluginId);
        env.put("PLUGIN_PORT", String.valueOf(port));

        PythonPluginProcess proc = new PythonPluginProcess(
                pluginId, port, extractDir, properties.executable(), env);
        proc.start();

        try {
            waitForHealth(pluginId, port);
        } catch (Exception e) {
            proc.stop();
            throw e;
        }

        processes.put(pluginId, proc);
        log.info("Python plugin '{}' started on port {}", pluginId, port);
        return port;
    }

    /**
     * Stops the Python process for the given plugin.
     */
    public void stopPlugin(String pluginId) {
        PythonPluginProcess proc = processes.remove(pluginId);
        if (proc != null) {
            proc.stop();
            log.info("Python plugin '{}' stopped", pluginId);
        }
    }

    /**
     * Returns the process handle for the given plugin, if running.
     */
    public Optional<PythonPluginProcess> getProcess(String pluginId) {
        return Optional.ofNullable(processes.get(pluginId));
    }

    /**
     * Returns the port for a running plugin, or empty if not running.
     */
    public Optional<Integer> getPort(String pluginId) {
        return getProcess(pluginId).map(PythonPluginProcess::getPort);
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down all Python plugin processes ({} running)", processes.size());
        processes.values().forEach(PythonPluginProcess::stop);
        processes.clear();
    }

    /**
     * Periodic health check — marks dead processes.
     */
    @Scheduled(fixedDelay = 30000)
    public void healthMonitor() {
        processes.forEach((pluginId, proc) -> {
            if (!proc.isAlive()) {
                log.warn("Python plugin '{}' process is dead, removing", pluginId);
                if (processes.remove(pluginId, proc)) {
                    proc.stop();
                }
            }
        });
    }

    private int allocatePort() {
        int rangeSize = properties.portRangeEnd() - properties.portRangeStart();
        for (int attempt = 0; attempt < rangeSize; attempt++) {
            int port = properties.portRangeStart()
                    + (Math.abs(nextPort.getAndIncrement()) % rangeSize);
            if (!isPortInUse(port)) return port;
        }
        throw new IllegalStateException("No free port available in range "
                + properties.portRangeStart() + "-" + properties.portRangeEnd());
    }

    private boolean isPortInUse(int port) {
        try (var ignored = new java.net.ServerSocket(port)) {
            return false;
        } catch (java.io.IOException e) {
            return true;
        }
    }

    private void waitForHealth(String pluginId, int port) throws Exception {
        String url = "http://localhost:" + port + "/health";
        long deadline = System.currentTimeMillis() + (properties.healthCheckTimeoutSeconds() * 1000L);
        long delay = 1000;

        while (System.currentTimeMillis() < deadline) {
            try {
                String body = restClient.get().uri(url).retrieve().body(String.class);
                if (body != null && body.contains("ok")) {
                    log.info("Plugin '{}' health check passed on port {}", pluginId, port);
                    return;
                }
            } catch (Exception e) {
                // not ready yet
            }
            Thread.sleep(delay);
            delay = Math.min(delay * 2, 8000);
        }
        throw new IllegalStateException(
                "Plugin '%s' failed health check within %ds on port %d"
                        .formatted(pluginId, properties.healthCheckTimeoutSeconds(), port));
    }
}
