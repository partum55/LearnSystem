package com.university.lms.plugin.runtime.python;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Manages the lifecycle of a single Python sidecar process.
 *
 * <p>Launches a Python interpreter with the plugin's {@code main.py} and captures
 * stdout/stderr in a bounded ring buffer for diagnostics.
 */
@Slf4j
public class PythonPluginProcess {

    private static final int LOG_BUFFER_SIZE = 500;

    @Getter
    private final String pluginId;
    @Getter
    private final int port;
    private final Path workDir;
    private final String executable;
    private final Map<String, String> environment;

    private Process process;
    private final Deque<String> logBuffer = new ArrayDeque<>(LOG_BUFFER_SIZE);
    private Thread stdoutThread;
    private Thread stderrThread;

    public PythonPluginProcess(String pluginId, int port, Path workDir,
                               String executable, Map<String, String> environment) {
        this.pluginId = pluginId;
        this.port = port;
        this.workDir = workDir;
        this.executable = executable;
        this.environment = environment;
    }

    /**
     * Starts the Python process.
     */
    public void start() throws IOException {
        Path venvPython = workDir.resolve(".venv/bin/python");
        String pythonExe = venvPython.toFile().exists() ? venvPython.toString() : executable;

        ProcessBuilder pb = new ProcessBuilder(pythonExe, "main.py");
        pb.directory(workDir.toFile());
        pb.environment().putAll(environment);
        pb.redirectErrorStream(false);

        log.info("Starting Python plugin '{}' on port {} in {}", pluginId, port, workDir);
        process = pb.start();

        stdoutThread = startLogCapture(process, "stdout");
        stderrThread = startLogCapture(process, "stderr");
    }

    /**
     * Stops the Python process gracefully, then forcibly if needed.
     */
    public void stop() {
        if (process == null || !process.isAlive()) {
            return;
        }
        log.info("Stopping Python plugin '{}'", pluginId);
        process.destroy();
        try {
            if (!process.waitFor(5, TimeUnit.SECONDS)) {
                log.warn("Plugin '{}' did not exit gracefully, forcing", pluginId);
                process.destroyForcibly();
                process.waitFor(3, TimeUnit.SECONDS);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
        }
        if (stdoutThread != null) stdoutThread.interrupt();
        if (stderrThread != null) stderrThread.interrupt();
    }

    /**
     * Returns whether the underlying OS process is alive.
     */
    public boolean isAlive() {
        return process != null && process.isAlive();
    }

    /**
     * Returns the most recent log lines from the process output.
     */
    public List<String> getRecentLogs(int n) {
        synchronized (logBuffer) {
            return logBuffer.stream()
                    .skip(Math.max(0, logBuffer.size() - n))
                    .toList();
        }
    }

    private Thread startLogCapture(Process proc, String streamName) {
        BufferedReader reader = new BufferedReader(new InputStreamReader(
                "stdout".equals(streamName) ? proc.getInputStream() : proc.getErrorStream()));
        Thread t = Thread.ofVirtual().name("plugin-" + pluginId + "-" + streamName).start(() -> {
            try {
                String line;
                while ((line = reader.readLine()) != null) {
                    synchronized (logBuffer) {
                        if (logBuffer.size() >= LOG_BUFFER_SIZE) {
                            logBuffer.pollFirst();
                        }
                        logBuffer.addLast("[%s] %s".formatted(streamName, line));
                    }
                    log.trace("[plugin:{}:{}] {}", pluginId, streamName, line);
                }
            } catch (IOException e) {
                // process ended
            }
        });
        return t;
    }
}
