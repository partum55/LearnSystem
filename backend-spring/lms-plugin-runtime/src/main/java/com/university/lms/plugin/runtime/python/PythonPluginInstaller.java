package com.university.lms.plugin.runtime.python;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.plugin.api.PluginManifest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Handles Python plugin ZIP extraction, manifest reading, and virtualenv setup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PythonPluginInstaller {

    private final ObjectMapper objectMapper;
    private final PythonPluginProperties properties;

    /**
     * Reads the plugin manifest from the ZIP's root {@code plugin.json}.
     */
    public PluginManifest readManifestFromZip(Path zipPath) throws IOException {
        try (var zis = new ZipInputStream(Files.newInputStream(zipPath))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("plugin.json".equals(entry.getName())) {
                    return objectMapper.readValue(zis.readAllBytes(), PluginManifest.class);
                }
            }
        }
        throw new IllegalArgumentException("ZIP does not contain plugin.json at root: " + zipPath);
    }

    /**
     * Extracts the ZIP contents to {@code /data/plugins/python/{pluginId}/}.
     * Validates no path traversal and that both {@code plugin.json} and {@code main.py} exist.
     *
     * @param zipPath  path to the uploaded ZIP file
     * @param pluginId the plugin identifier (used as directory name)
     * @param baseDir  base directory for Python plugin extraction
     * @return the extraction directory
     */
    public Path extractZip(Path zipPath, String pluginId, Path baseDir) throws IOException {
        Path extractDir = baseDir.resolve("python").resolve(pluginId);
        Files.createDirectories(extractDir);

        try (var zis = new ZipInputStream(Files.newInputStream(zipPath))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.isDirectory()) continue;

                Path target = extractDir.resolve(entry.getName()).normalize();
                // Guard against zip-slip
                if (!target.startsWith(extractDir)) {
                    throw new SecurityException("ZIP entry escapes target directory: " + entry.getName());
                }
                Files.createDirectories(target.getParent());
                Files.copy(zis, target, StandardCopyOption.REPLACE_EXISTING);
            }
        }

        // Validate required files
        if (!Files.exists(extractDir.resolve("plugin.json"))) {
            cleanup(pluginId, baseDir);
            throw new IllegalArgumentException("Extracted ZIP missing plugin.json");
        }
        if (!Files.exists(extractDir.resolve("main.py"))) {
            cleanup(pluginId, baseDir);
            throw new IllegalArgumentException("Extracted ZIP missing main.py");
        }

        log.info("Extracted Python plugin '{}' to {}", pluginId, extractDir);
        return extractDir;
    }

    /**
     * Creates a virtualenv and installs dependencies from requirements.txt.
     */
    public void setupVirtualenv(Path extractDir) throws Exception {
        if (!properties.venvEnabled()) {
            log.info("Virtualenv disabled, skipping for {}", extractDir);
            return;
        }

        String python = properties.executable();

        // Create venv
        log.info("Creating virtualenv in {}", extractDir);
        int venvExit = runProcess(extractDir, properties.installTimeoutSeconds(),
                python, "-m", "venv", ".venv");
        if (venvExit != 0) {
            throw new IllegalStateException("Failed to create virtualenv (exit code " + venvExit + ")");
        }

        // Install requirements if present
        Path requirements = extractDir.resolve("requirements.txt");
        if (Files.exists(requirements)) {
            String pip = extractDir.resolve(".venv/bin/pip").toString();
            log.info("Installing requirements from {}", requirements);
            int pipExit = runProcess(extractDir, properties.installTimeoutSeconds(),
                    pip, "install", "-r", "requirements.txt");
            if (pipExit != 0) {
                throw new IllegalStateException("pip install failed (exit code " + pipExit + ")");
            }
        }
    }

    /**
     * Deletes the extracted plugin directory.
     */
    public void cleanup(String pluginId, Path baseDir) {
        Path extractDir = baseDir.resolve("python").resolve(pluginId);
        if (!Files.exists(extractDir)) return;

        try {
            Files.walkFileTree(extractDir, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                    Files.delete(dir);
                    return FileVisitResult.CONTINUE;
                }
            });
            log.info("Cleaned up Python plugin directory: {}", extractDir);
        } catch (IOException e) {
            log.warn("Failed to clean up plugin directory {}: {}", extractDir, e.getMessage());
        }
    }

    private int runProcess(Path workDir, int timeoutSeconds, String... command) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workDir.toFile());
        pb.inheritIO();
        Process proc = pb.start();
        if (!proc.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
            proc.destroyForcibly();
            throw new IllegalStateException("Process timed out after " + timeoutSeconds + "s: " + String.join(" ", command));
        }
        return proc.exitValue();
    }
}
