package com.university.lms.plugin.runtime.web;

import com.university.lms.plugin.runtime.PluginLoader;
import com.university.lms.plugin.runtime.PluginRegistration;
import com.university.lms.plugin.runtime.PluginRegistry;
import com.university.lms.plugin.runtime.PluginStatus;
import com.university.lms.plugin.runtime.entity.InstalledPlugin;
import com.university.lms.plugin.runtime.repository.InstalledPluginRepository;
import com.university.lms.plugin.runtime.repository.PluginEventLogRepository;
import com.university.lms.plugin.runtime.entity.PluginEventLog;
import com.university.lms.plugin.runtime.web.PluginManagementDto.PluginConfigResponse;
import com.university.lms.plugin.runtime.web.PluginManagementDto.PluginDto;
import com.university.lms.plugin.runtime.web.PluginManagementDto.PluginStatusResponse;
import com.university.lms.plugin.runtime.web.PluginManagementDto.UpdateConfigRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;

/**
 * REST controller for plugin lifecycle management.
 * All endpoints require SUPERADMIN role.
 */
@RestController
@RequestMapping("/api/plugins")
@PreAuthorize("hasRole('SUPERADMIN')")
@RequiredArgsConstructor
@Slf4j
public class PluginManagementController {

    private final InstalledPluginRepository installedPluginRepository;
    private final PluginEventLogRepository pluginEventLogRepository;
    private final PluginRegistry pluginRegistry;
    private final PluginLoader pluginLoader;

    @Value("${plugin.storage.path:/data/plugins}")
    private String pluginStoragePath;

    @GetMapping
    public ResponseEntity<List<PluginDto>> listPlugins() {
        List<PluginDto> plugins = installedPluginRepository.findAll().stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(plugins);
    }

    @GetMapping("/{pluginId}")
    public ResponseEntity<PluginDto> getPlugin(@PathVariable String pluginId) {
        InstalledPlugin plugin = findOrThrow(pluginId);
        return ResponseEntity.ok(toDto(plugin));
    }

    /**
     * Upload and install a plugin JAR at runtime (hot-load).
     */
    @PostMapping("/install")
    public ResponseEntity<PluginDto> installPlugin(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || (!originalFilename.endsWith(".jar") && !originalFilename.endsWith(".zip"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be a .jar or .zip");
        }

        try {
            Path storageDir = Paths.get(pluginStoragePath);
            Files.createDirectories(storageDir);

            // Sanitize filename to prevent path traversal
            String safeName = Paths.get(originalFilename).getFileName().toString();
            Path targetPath = storageDir.resolve(safeName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            PluginRegistration registration;
            if (originalFilename.endsWith(".zip")) {
                registration = pluginLoader.installPythonPlugin(targetPath);
            } else {
                registration = pluginLoader.installPlugin(targetPath);
            }
            String pluginId = registration.manifest().id();

            InstalledPlugin entity = findOrThrow(pluginId);
            log.info("Plugin '{}' installed via upload", pluginId);
            return ResponseEntity.status(HttpStatus.CREATED).body(toDto(entity));

        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to install plugin: {}", ex.getMessage(), ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to install plugin: " + ex.getMessage());
        }
    }

    @PostMapping("/{pluginId}/enable")
    public ResponseEntity<PluginStatusResponse> enablePlugin(@PathVariable String pluginId) {
        InstalledPlugin plugin = findOrThrow(pluginId);

        plugin.setStatus(PluginStatus.ENABLED);
        installedPluginRepository.save(plugin);

        pluginRegistry.get(pluginId).ifPresent(reg -> {
            try {
                pluginLoader.enablePlugin(pluginId);
            } catch (Exception e) {
                log.warn("Plugin '{}' enable failed: {}", pluginId, e.getMessage());
            }
        });

        log.info("Plugin '{}' enabled", pluginId);
        return ResponseEntity.ok(new PluginStatusResponse(pluginId, PluginStatus.ENABLED, "Plugin enabled"));
    }

    @PostMapping("/{pluginId}/disable")
    public ResponseEntity<PluginStatusResponse> disablePlugin(@PathVariable String pluginId) {
        InstalledPlugin plugin = findOrThrow(pluginId);

        plugin.setStatus(PluginStatus.DISABLED);
        installedPluginRepository.save(plugin);

        pluginRegistry.get(pluginId).ifPresent(reg -> {
            try {
                pluginLoader.disablePlugin(pluginId);
            } catch (Exception e) {
                log.warn("Plugin '{}' disable failed: {}", pluginId, e.getMessage());
            }
        });

        log.info("Plugin '{}' disabled", pluginId);
        return ResponseEntity.ok(new PluginStatusResponse(pluginId, PluginStatus.DISABLED, "Plugin disabled"));
    }

    @DeleteMapping("/{pluginId}")
    public ResponseEntity<Void> uninstallPlugin(@PathVariable String pluginId) {
        findOrThrow(pluginId);

        if (pluginRegistry.isRegistered(pluginId)) {
            try {
                pluginLoader.unloadPlugin(pluginId);
            } catch (Exception e) {
                log.warn("Plugin '{}' unload failed: {}", pluginId, e.getMessage());
                // Still clean up the database record
                pluginRegistry.unregister(pluginId);
                installedPluginRepository.findByPluginId(pluginId)
                        .ifPresent(installedPluginRepository::delete);
            }
        } else {
            // Plugin not in registry (maybe failed to load), just remove DB record
            installedPluginRepository.findByPluginId(pluginId)
                    .ifPresent(installedPluginRepository::delete);
        }

        log.info("Plugin '{}' uninstalled", pluginId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{pluginId}/config")
    public ResponseEntity<PluginConfigResponse> getConfig(@PathVariable String pluginId) {
        InstalledPlugin plugin = findOrThrow(pluginId);
        Map<String, String> config = plugin.getConfig() != null ? plugin.getConfig() : Map.of();
        return ResponseEntity.ok(new PluginConfigResponse(pluginId, config));
    }

    @PutMapping("/{pluginId}/config")
    public ResponseEntity<PluginConfigResponse> updateConfig(
            @PathVariable String pluginId,
            @RequestBody UpdateConfigRequest request) {
        InstalledPlugin plugin = findOrThrow(pluginId);
        plugin.setConfig(request.config());
        installedPluginRepository.save(plugin);

        log.info("Plugin '{}' config updated", pluginId);
        return ResponseEntity.ok(new PluginConfigResponse(pluginId, request.config()));
    }

    @GetMapping("/{pluginId}/logs")
    public ResponseEntity<List<PluginEventLog>> getPluginLogs(
            @PathVariable String pluginId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var pageable = org.springframework.data.domain.PageRequest.of(page, size);
        var logs = pluginEventLogRepository
                .findByPluginIdOrderByOccurredAtDesc(pluginId, pageable);
        return ResponseEntity.ok(logs.getContent());
    }

    private InstalledPlugin findOrThrow(String pluginId) {
        return installedPluginRepository.findByPluginId(pluginId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Plugin not found: " + pluginId));
    }

    private PluginDto toDto(InstalledPlugin entity) {
        return new PluginDto(
                entity.getPluginId(),
                entity.getName(),
                entity.getVersion(),
                entity.getDescription(),
                entity.getAuthor(),
                entity.getType(),
                entity.getStatus(),
                entity.getPermissions(),
                entity.getInstalledAt(),
                entity.getJarFileName(),
                entity.getRuntime()
        );
    }
}
